import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { findAuthUserByEmail } from "@/lib/auth/users";
import {
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth/password";
import {
  attachSessionCookie,
  createSessionToken,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email?: string; password?: string }>(request);
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";

    if (!email || !password) {
      return jsonError("Введите email и пароль", 400);
    }

    const user = await findAuthUserByEmail(email);
    if (!user) {
      return jsonError("Неверный email или пароль", 401);
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return jsonError("Неверный email или пароль", 401);
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
    });
    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
    return attachSessionCookie(res, token);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Ошибка входа", 500);
  }
}
