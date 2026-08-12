import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma-client";
import { mapUser } from "@/lib/db/mappers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { useLocalDb } from "@/lib/db";
import { localDb } from "@/lib/db/local";
import type { User } from "@/lib/types";

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  if (useLocalDb()) {
    const store = await localDb.getStore();
    const row = store.users.find((u) => u.id === session.userId);
    if (!row || row.email.toLowerCase() !== session.email.toLowerCase()) {
      return null;
    }
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      created_at: row.created_at,
    };
  }

  const row = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!row || row.email.toLowerCase() !== session.email.toLowerCase()) {
    return null;
  }
  return mapUser(row);
}

export async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Требуется авторизация");
  }
  return user;
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
