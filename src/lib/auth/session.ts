import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  type SessionPayload,
} from "@/lib/auth/session-token";

export {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  type SessionPayload,
} from "@/lib/auth/session-token";
export { verifySessionToken } from "@/lib/auth/session-token";

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

export function attachSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

export function clearSessionCookieOn(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return res;
}

export async function createAndSetSession(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  await setSessionCookie(token);
  return token;
}
