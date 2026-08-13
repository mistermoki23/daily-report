import { NextResponse } from "next/server";
import { clearSessionCookieOn } from "@/lib/auth/session";
import { getSessionUser } from "@/lib/auth/current-user";
import { logActivity } from "@/lib/auth/activity";

export async function POST() {
  const user = await getSessionUser();
  if (user) {
    await logActivity({ userId: user.id, action: "LOGOUT" });
  }
  const res = NextResponse.json({ ok: true });
  return clearSessionCookieOn(res);
}
