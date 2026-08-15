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

/** Bust cached client after schema changes (Brand model, soft-delete, roles). */
const SCHEMA_HASH = "brands-v3";

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasBrandDelegate(client: PrismaClient): boolean {
  return typeof (client as { brand?: { findMany?: unknown } }).brand?.findMany ===
    "function";
}

function resolvePrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (
    cached &&
    globalForPrisma.prismaSchemaHash === SCHEMA_HASH &&
    hasBrandDelegate(cached)
  ) {
    return cached;
  }

  // Drop stale client from long-lived `next dev` started before Brand existed.
  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }

  const created = createPrismaClient();
  if (!hasBrandDelegate(created)) {
    throw new Error(
      "Prisma Client без модели Brand. Выполните `npx prisma generate` и перезапустите сервер."
    );
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = created;
    globalForPrisma.prismaSchemaHash = SCHEMA_HASH;
  }

  return created;
}

export const prisma = resolvePrismaClient();
