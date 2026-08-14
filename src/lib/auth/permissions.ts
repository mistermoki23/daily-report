import {
  isAdminRole,
  isManagerRole,
  normalizeUserRole,
} from "@/lib/auth/roles";

export type WorkspacePermissions = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageAccess: boolean;
  canUpdateDailyData: boolean;
  canAccessAdmin: boolean;
  canAccessSettings: boolean;
  canAccessDailyUpdate: boolean;
  canExport: boolean;
  seesAllCampaigns: boolean;
};

export function getPermissions(
  role: string | null | undefined
): WorkspacePermissions {
  const normalized = normalizeUserRole(role);
  const isAdmin = normalized === "ADMIN";
  const isManager = normalized === "MANAGER";

  return {
    canView: true,
    canCreate: isAdmin || isManager,
    canEdit: isAdmin || isManager,
    canDelete: isAdmin,
    canManageUsers: isAdmin,
    canManageAccess: isAdmin,
    canUpdateDailyData: isAdmin || isManager,
    canAccessAdmin: isAdmin,
    canAccessSettings: isAdmin || isManager,
    canAccessDailyUpdate: isAdmin || isManager,
    canExport: true,
    seesAllCampaigns: isAdmin,
  };
}

export function canView(role?: string | null): boolean {
  return getPermissions(role).canView;
}

export function canCreate(role?: string | null): boolean {
  return getPermissions(role).canCreate;
}

export function canEdit(role?: string | null): boolean {
  return getPermissions(role).canEdit;
}

export function canDelete(role?: string | null): boolean {
  return getPermissions(role).canDelete;
}

export function canManageUsers(role?: string | null): boolean {
  return getPermissions(role).canManageUsers;
}

export function canManageAccess(role?: string | null): boolean {
  return getPermissions(role).canManageAccess;
}

export function canUpdateDailyData(role?: string | null): boolean {
  return getPermissions(role).canUpdateDailyData;
}

export function canAccessAdmin(role?: string | null): boolean {
  return getPermissions(role).canAccessAdmin;
}

export function canAccessSettings(role?: string | null): boolean {
  return getPermissions(role).canAccessSettings;
}

export function canAccessDailyUpdate(role?: string | null): boolean {
  return getPermissions(role).canAccessDailyUpdate;
}

export function canExport(role?: string | null): boolean {
  return getPermissions(role).canExport;
}

export function seesAllCampaigns(role?: string | null): boolean {
  return getPermissions(role).seesAllCampaigns;
}

/** @deprecated use canCreate / canEdit / canUpdateDailyData */
export function canWriteWorkspace(role?: string | null): boolean {
  return canCreate(role) || canEdit(role);
}

export { isAdminRole, isManagerRole, normalizeUserRole };
