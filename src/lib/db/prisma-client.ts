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

/** Bust cached client after schema changes (e.g. User.role String → UserRole). */
const SCHEMA_HASH = "user-role-enum-v1";

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma && globalForPrisma.prismaSchemaHash === SCHEMA_HASH
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaHash = SCHEMA_HASH;
}
