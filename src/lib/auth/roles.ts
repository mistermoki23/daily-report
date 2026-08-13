export const USER_ROLES = ["USER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

export function normalizeUserRole(role: string | null | undefined): UserRole {
  return role === "ADMIN" ? "ADMIN" : "USER";
}

export function splitDisplayName(name: string): {
  firstName: string;
  lastName: string;
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function isUserActive(lastLoginAt: Date | string | null | undefined): boolean {
  if (!lastLoginAt) return false;
  const ts = typeof lastLoginAt === "string" ? new Date(lastLoginAt) : lastLoginAt;
  if (Number.isNaN(ts.getTime())) return false;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - ts.getTime() <= thirtyDaysMs;
}
