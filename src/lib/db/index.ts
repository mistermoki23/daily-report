import "server-only";

import { localDb } from "@/lib/db/local";
import { prismaDb } from "@/lib/db/prisma";

/**
 * Data access layer.
 *
 * - Default / Vercel / production: PostgreSQL via Prisma (Supabase)
 * - Local JSON demo only when explicitly USE_LOCAL_DB=true and not on Vercel
 *
 * Auth (register/login/session) always uses Prisma — never this local store.
 */
export function useLocalDb(): boolean {
  // Never use filesystem JSON store on Vercel / serverless
  if (process.env.VERCEL || process.env.VERCEL_ENV) return false;
  if (process.env.USE_LOCAL_DB === "true") return true;
  if (!process.env.DATABASE_URL) return true;
  return false;
}

function resolveDb() {
  return useLocalDb() ? localDb : prismaDb;
}

/** Lazy so env is evaluated per request, not only at module init. */
export const db = new Proxy({} as typeof prismaDb, {
  get(_target, prop, receiver) {
    const impl = resolveDb() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});

export type AppDb = typeof localDb | typeof prismaDb;
