import "server-only";

import { hash, compare } from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return compare(password, passwordHash);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Пароль должен быть не короче 8 символов";
  }
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
