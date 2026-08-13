import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma-client";
import { mapUser } from "@/lib/db/mappers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import type { User } from "@/lib/types";

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

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

export async function requireAdminUser(): Promise<User> {
  const user = await requireSessionUser();
  if (!isAdminRole(user.role)) {
    throw new AuthError("Требуются права администратора", 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
