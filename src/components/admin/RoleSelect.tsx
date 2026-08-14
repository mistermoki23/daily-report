"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  normalizeUserRole,
  type AssignableRole,
} from "@/lib/auth/roles";

export function RoleSelect({
  userId,
  currentRole,
  compact = false,
}: {
  userId: string;
  currentRole: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<AssignableRole>(normalizeUserRole(currentRole));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onChange(next: string) {
    const nextRole = normalizeUserRole(next);
    setError("");
    setSaving(true);
    const prev = role;
    setRole(nextRole);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRole(prev);
        setError(data.error || "Ошибка сохранения роли");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <select
        value={role}
        disabled={saving}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Роль пользователя"
        className={
          compact
            ? "w-full min-w-[8.5rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] font-medium text-slate-900"
            : "mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-900"
        }
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-[11px] text-rose-600">{error}</p> : null}
    </div>
  );
}
