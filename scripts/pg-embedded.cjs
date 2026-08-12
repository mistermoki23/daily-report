/**
 * Start / stop local embedded PostgreSQL for development when Docker is unavailable.
 *
 * Usage:
 *   node scripts/pg-embedded.cjs start
 *   node scripts/pg-embedded.cjs stop
 *
 * Connection:
 *   postgresql://campaign:campaign@127.0.0.1:5433/campaign_monitor?schema=public
 */
const path = require("path");
const fs = require("fs");
const EmbeddedPostgres = require("embedded-postgres").default;

const dir = path.join(process.cwd(), ".pgdata");
const port = 5433;
const url =
  "postgresql://campaign:campaign@127.0.0.1:5433/campaign_monitor?schema=public";

async function create() {
  fs.mkdirSync(dir, { recursive: true });
  return new EmbeddedPostgres({
    databaseDir: dir,
    user: "campaign",
    password: "campaign",
    port,
    persistent: true,
  });
}

async function start() {
  const pg = await create();
  if (!fs.existsSync(path.join(dir, "PG_VERSION"))) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("campaign_monitor");
  } catch {
    // already exists
  }
  console.log("PostgreSQL ready:", url);
  console.log("Set in .env:");
  console.log(`DATABASE_URL="${url}"`);
  console.log(
    "And remove USE_LOCAL_DB=true from .env.local (or set USE_LOCAL_DB=false)"
  );
  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });
  await new Promise(() => {});
}

async function stop() {
  const pg = await create();
  await pg.stop();
  console.log("stopped");
}

const cmd = process.argv[2] || "start";
(cmd === "stop" ? stop() : start()).catch((e) => {
  console.error(e);
  process.exit(1);
});
