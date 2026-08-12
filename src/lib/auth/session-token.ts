import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cm_session";
export const SESSION_DAYS = 30;

export type SessionPayload = {
  userId: string;
  email: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    return new TextEncoder().encode(
      "campaign-monitor-dev-secret-change-me"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!userId || !email) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(
  maxAgeSeconds = SESSION_DAYS * 24 * 60 * 60
) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
