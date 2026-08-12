import "server-only";

import { localDb } from "@/lib/db/local";
import { prismaDb } from "@/lib/db/prisma";

/**
 * Use PostgreSQL (Prisma) when DATABASE_URL is set and USE_LOCAL_DB is not "true".
 * Otherwise keep the local JSON store (demo mode).
 */
export function useLocalDb(): boolean {
  if (process.env.USE_LOCAL_DB === "true") return true;
  if (!process.env.DATABASE_URL) return true;
  return false;
}

export const db = useLocalDb() ? localDb : prismaDb;

export type AppDb = typeof localDb | typeof prismaDb;
