export const USER_ROLES = ["USER", "MANAGER", "READER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles an admin may assign. Legacy USER is not offered in the UI. */
export const ASSIGNABLE_ROLES = ["ADMIN", "MANAGER", "READER"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Админ",
  MANAGER: "Менеджер",
  READER: "Читатель",
  USER: "Менеджер",
};

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

export function isReaderRole(role: string | null | undefined): boolean {
  return normalizeUserRole(role) === "READER";
}

export function isManagerRole(role: string | null | undefined): boolean {
  return normalizeUserRole(role) === "MANAGER";
}

export function isAssignableRole(role: string): role is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

/**
 * Canonical role for permission checks.
 * Legacy USER is treated as MANAGER (same write access, no admin).
 */
export function normalizeUserRole(role: string | null | undefined): AssignableRole {
  if (role === "ADMIN") return "ADMIN";
  if (role === "READER") return "READER";
  if (role === "MANAGER" || role === "USER") return "MANAGER";
  return "MANAGER";
}

export function displayRoleLabel(role: string | null | undefined): string {
  if (role === "ADMIN") return ROLE_LABELS.ADMIN;
  if (role === "READER") return ROLE_LABELS.READER;
  if (role === "MANAGER" || role === "USER") return ROLE_LABELS.MANAGER;
  return ROLE_LABELS.MANAGER;
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
