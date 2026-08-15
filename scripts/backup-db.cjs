/**
 * Read-only logical backup of the live Prisma/PostgreSQL (Supabase) database.
 * SELECT only — does not modify schema or data.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=.env scripts/backup-db.mjs
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { PrismaClient, Prisma } = require("@prisma/client");

const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\.\d+Z$/, "Z")
  .replace("T", "-");
const backupsDir = path.join(process.cwd(), "backups");
fs.mkdirSync(backupsDir, { recursive: true });

const outPath = path.join(backupsDir, `campaign_monitor_${stamp}_full.sql`);
const manifestPath = path.join(
  backupsDir,
  `campaign_monitor_${stamp}_manifest.json`
);
const schemaTmp = path.join(backupsDir, `_schema_${stamp}.sql`);

const TABLE_ORDER = [
  "users",
  "clients",
  "platforms",
  "campaigns",
  "campaign_plans",
  "daily_data",
  "report_access",
  "report_activity",
  "plan_change_logs",
  "campaign_change_logs",
  "_prisma_migrations",
];

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite number in dump");
    return String(value);
  }
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) {
    return `'${value.toISOString().replace(/'/g, "''")}'`;
  }
  if (Prisma.Decimal && value instanceof Prisma.Decimal) {
    return value.toString();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.toFixed === "function" &&
    typeof value.toString === "function" &&
    !Array.isArray(value)
  ) {
    return value.toString();
  }
  if (Buffer.isBuffer(value)) {
    return `'\\x${value.toString("hex")}'`;
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateSchemaSql() {
  const result = spawnSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--script",
    ],
    { encoding: "utf8", cwd: process.cwd() }
  );
  if (result.status !== 0) {
    throw new Error(
      `prisma migrate diff failed: ${result.stderr || result.stdout}`
    );
  }
  fs.writeFileSync(schemaTmp, result.stdout, { mode: 0o600 });
  return result.stdout;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const schemaSql = generateSchemaSql();
    const lines = [];
    lines.push("-- Campaign Monitor full logical backup");
    lines.push(`-- Created: ${new Date().toISOString()}`);
    lines.push("-- Source: Prisma + PostgreSQL (Supabase)");
    lines.push(
      "-- Mode: READ-ONLY dump (SELECT only). No schema/data mutations were performed."
    );
    lines.push(
      "-- NOTE: Contains application data including password hashes. Keep private."
    );
    lines.push(
      "-- Restore requires a compatible empty/target DB; review before applying."
    );
    lines.push("");
    lines.push("BEGIN;");
    lines.push("");
    lines.push("-- ========== SCHEMA (from prisma schema datamodel) ==========");
    lines.push(schemaSql.trim());
    lines.push("");
    lines.push("-- ========== DATA ==========");
    lines.push("");

    const colRows = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    const colsByTable = {};
    for (const r of colRows) {
      (colsByTable[r.table_name] ||= []).push(r.column_name);
    }

    const liveTables = await prisma.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const liveSet = new Set(liveTables.map((t) => t.table_name));
    const ordered = [
      ...TABLE_ORDER.filter((t) => liveSet.has(t)),
      ...[...liveSet].filter((t) => !TABLE_ORDER.includes(t)).sort(),
    ];

    const dumpedCounts = {};
    for (const table of ordered) {
      const colNames = colsByTable[table];
      if (!colNames?.length) throw new Error(`No columns for ${table}`);
      const selectList = colNames.map(quoteIdent).join(", ");
      const rows = await prisma.$queryRawUnsafe(
        `SELECT ${selectList} FROM ${quoteIdent(table)}`
      );
      dumpedCounts[table] = rows.length;
      lines.push(`-- Table: ${table} (${rows.length} rows)`);
      if (rows.length === 0) {
        lines.push("-- (empty)");
        lines.push("");
        continue;
      }
      const colSql = colNames.map(quoteIdent).join(", ");
      for (const row of rows) {
        const values = colNames.map((c) => sqlLiteral(row[c])).join(", ");
        lines.push(
          `INSERT INTO ${quoteIdent(table)} (${colSql}) VALUES (${values});`
        );
      }
      lines.push("");
    }

    lines.push("COMMIT;");
    lines.push("");
    fs.writeFileSync(outPath, lines.join("\n"), { mode: 0o600 });

    const liveCounts = {};
    for (const table of ordered) {
      const r = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS n FROM ${quoteIdent(table)}`
      );
      liveCounts[table] = r[0].n;
    }

    const stat = fs.statSync(outPath);
    const countsMatch =
      JSON.stringify(dumpedCounts) === JSON.stringify(liveCounts);
    if (!countsMatch) {
      throw new Error("Dumped row counts do not match live DB counts");
    }
    if (stat.size <= 0) throw new Error("Dump file is empty");

    const storeSrc = path.join(process.cwd(), "data", "store.json");
    let storeCopy = null;
    if (fs.existsSync(storeSrc)) {
      storeCopy = path.join(
        backupsDir,
        `campaign_monitor_${stamp}_store.json.copy`
      );
      fs.copyFileSync(storeSrc, storeCopy);
    }

    const manifest = {
      createdAt: new Date().toISOString(),
      stamp,
      backend: "Prisma PostgreSQL / Supabase",
      dumpFile: path.basename(outPath),
      dumpPath: outPath,
      dumpBytes: stat.size,
      storeJsonCopy: storeCopy ? path.basename(storeCopy) : null,
      tableOrder: ordered,
      dumpedRowCounts: dumpedCounts,
      liveRowCountsAtDumpTime: liveCounts,
      countsMatch,
      notes: [
        "Read-only SELECT dump; database was not modified.",
        "Schema section generated via prisma migrate diff --from-empty --to-schema-datamodel.",
        "pg_dump was not available; this is a full logical SQL backup.",
        "Local data/store.json is unused by the app (USE_LOCAL_DB=false) but copied if present.",
      ],
    };
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      mode: 0o600,
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          outPath,
          manifestPath,
          dumpBytes: stat.size,
          countsMatch,
          users: liveCounts.users,
          campaigns: liveCounts.campaigns,
          daily_data: liveCounts.daily_data,
          tables: ordered,
        },
        null,
        2
      )
    );
  } finally {
    try {
      fs.unlinkSync(schemaTmp);
    } catch {
      /* ignore */
    }
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("BACKUP FAILED", e);
  process.exit(1);
});
