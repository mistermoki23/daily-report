import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { createAuthUser } from "@/lib/auth/users";
import {
  normalizeEmail,
  validatePassword,
} from "@/lib/auth/password";
import {
  attachSessionCookie,
  createSessionToken,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      passwordConfirm?: string;
    }>(request);

    const firstName = (body.firstName ?? "").trim();
    const lastName = (body.lastName ?? "").trim();
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";
    const passwordConfirm = body.passwordConfirm ?? "";

    if (!firstName) return jsonError("Введите имя", 400);
    if (!lastName) return jsonError("Введите фамилию", 400);
    if (!email || !email.includes("@")) {
      return jsonError("Введите корректный email", 400);
    }
    const pwdError = validatePassword(password);
    if (pwdError) return jsonError(pwdError, 400);
    if (password !== passwordConfirm) {
      return jsonError("Пароли не совпадают", 400);
    }

    const user = await createAuthUser({
      name: `${firstName} ${lastName}`.trim(),
      email,
      password,
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
    });
    const res = NextResponse.json({ user }, { status: 201 });
    return attachSessionCookie(res, token);
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Ошибка регистрации",
      400
    );
  }
}
