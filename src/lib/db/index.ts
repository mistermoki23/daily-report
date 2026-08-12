import "server-only";

import { localDb } from "@/lib/db/local";
import { prismaDb } from "@/lib/db/prisma";

/**
 * Data access layer.
 *
 * - PostgreSQL (Prisma → Supabase): DATABASE_URL set and USE_LOCAL_DB !== "true"
 * - Local JSON demo: USE_LOCAL_DB=true or missing DATABASE_URL
 */
export function useLocalDb(): boolean {
  if (process.env.USE_LOCAL_DB === "true") return true;
  if (!process.env.DATABASE_URL) return true;
  return false;
}

export const db = useLocalDb() ? localDb : prismaDb;

export type AppDb = typeof localDb | typeof prismaDb;
