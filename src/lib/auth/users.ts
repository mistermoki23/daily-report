import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma-client";
import { mapUser } from "@/lib/db/mappers";
import { hashPassword } from "@/lib/auth/password";
import type { User } from "@/lib/types";

export type AuthUser = User & { password_hash: string };

/** Auth users are always stored in PostgreSQL/Supabase via Prisma — never local JSON/fs. */
export async function findAuthUserByEmail(
  email: string
): Promise<AuthUser | null> {
  const normalized = email.trim().toLowerCase();
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

  try {
    const row = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        // New registrations are MANAGER. Legacy USER rows stay USER in the DB.
        role: "MANAGER",
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
