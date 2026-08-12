import { NextResponse } from "next/server";
import { clearSessionCookieOn } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  return clearSessionCookieOn(res);
}
