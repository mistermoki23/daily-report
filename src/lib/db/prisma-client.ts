import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Prisma reads DATABASE_URL / DIRECT_URL from process.env (schema.prisma).
 * On Vercel these must be set in Project Settings → Environment Variables —
 * `.env.local` is gitignored and never deployed.
 */
function requireServerEnv(name: "DATABASE_URL" | "DIRECT_URL") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is missing or empty. Set a non-empty value in Vercel → Settings → Environment Variables for Production, then Redeploy. Do not rely on .env.local (it is not deployed).`
    );
  }
  return value;
}

const databaseUrl = requireServerEnv("DATABASE_URL");
requireServerEnv("DIRECT_URL");

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaHash?: string;
};

/**
 * Bump whenever prisma/schema.prisma models/delegates change so long-lived
 * `next dev` drops a stale PrismaClient (missing campaign/brand/etc.).
 */
const SCHEMA_HASH = "screenshots-v1";

type DelegateName =
  | "campaign"
  | "brand"
  | "campaignScreenshot"
  | "user"
  | "reportAccess";

function hasDelegate(
  client: PrismaClient | undefined,
  name: DelegateName
): boolean {
  if (!client) return false;
  const delegate = (client as unknown as Record<string, { findMany?: unknown }>)[
    name
  ];
  return typeof delegate?.findMany === "function";
}

function isHealthyPrismaClient(client: PrismaClient | undefined): boolean {
  return (
    hasDelegate(client, "campaign") &&
    hasDelegate(client, "brand") &&
    hasDelegate(client, "campaignScreenshot") &&
    hasDelegate(client, "user") &&
    hasDelegate(client, "reportAccess")
  );
}

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function resolvePrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (
    cached &&
    globalForPrisma.prismaSchemaHash === SCHEMA_HASH &&
    isHealthyPrismaClient(cached)
  ) {
    return cached;
  }

  // Drop stale client from long-lived `next dev` (pre-Brand / pre-Screenshot).
  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }

  const created = createPrismaClient();
  if (!isHealthyPrismaClient(created)) {
    throw new Error(
      "Prisma Client устарел или сгенерирован не из актуального schema.prisma (нет campaign/brand/campaignScreenshot). Выполните `npx prisma generate` и перезапустите сервер."
    );
  }

  globalForPrisma.prisma = created;
  globalForPrisma.prismaSchemaHash = SCHEMA_HASH;
  return created;
}

/**
 * Lazy proxy: every access re-validates the client so hot-reload / stale
 * globalThis never leaves `prisma.campaign` undefined.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = resolvePrismaClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
