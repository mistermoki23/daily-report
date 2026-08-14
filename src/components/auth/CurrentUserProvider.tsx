"use client";

import { createContext, useContext } from "react";
import {
  getPermissions,
  type WorkspacePermissions,
} from "@/lib/auth/permissions";
import type { User } from "@/lib/types";

const CurrentUserContext = createContext<User | null>(null);

export function CurrentUserProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): User | null {
  return useContext(CurrentUserContext);
}

export function usePermissions(): WorkspacePermissions {
  return getPermissions(useCurrentUser()?.role);
}

export function useCanWrite(): boolean {
  const p = usePermissions();
  return p.canCreate || p.canEdit || p.canUpdateDailyData;
}

export function useCanDelete(): boolean {
  return usePermissions().canDelete;
}
