import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma-client";
import { mapUser } from "@/lib/db/mappers";
import { useLocalDb } from "@/lib/db";
import { localDb } from "@/lib/db/local";
import { hashPassword } from "@/lib/auth/password";
import type { User } from "@/lib/types";

export type AuthUser = User & { password_hash: string };

export async function findAuthUserByEmail(
  email: string
): Promise<AuthUser | null> {
  const normalized = email.trim().toLowerCase();
  if (useLocalDb()) {
    return localDb.findAuthUserByEmail(normalized);
  }
  const row = await prisma.user.findUnique({ where: { email: normalized } });
  if (!row) return null;
  return {
    ...mapUser(row),
    password_hash: row.passwordHash,
  };
}

export async function createAuthUser(input: {
  name: string;
  email: string;
  password: string;
  role?: string;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  if (useLocalDb()) {
    return localDb.createAuthUser({
      name: input.name.trim(),
      email,
      passwordHash,
      role: input.role ?? "employee",
    });
  }

  try {
    const row = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        role: input.role ?? "employee",
      },
    });
    return mapUser(row);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Пользователь с таким email уже зарегистрирован");
    }
    throw e;
  }
}
