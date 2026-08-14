import "server-only";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/current-user";
import {
  canAccessAdmin,
  canAccessDailyUpdate,
  canAccessSettings,
  canCreate,
} from "@/lib/auth/permissions";

export async function redirectIfCannotWrite(fallback = "/dashboard") {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canCreate(user.role)) redirect(fallback);
}

export async function redirectIfCannotAccessSettings(fallback = "/access-denied") {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessSettings(user.role)) redirect(fallback);
}

export async function redirectIfCannotAccessDailyUpdate(
  fallback = "/access-denied"
) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessDailyUpdate(user.role)) redirect(fallback);
}

export async function redirectIfNotAdmin(fallback = "/access-denied") {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user.role)) redirect(fallback);
}
