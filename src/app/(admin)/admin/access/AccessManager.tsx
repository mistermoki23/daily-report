"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { displayRoleLabel } from "@/lib/auth/roles";

type Report = { id: string; name: string; status: string };
type UserRow = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  reportIds: string[];
};

export function AccessManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/access");
      if (!res.ok) {
        toast.error("Failed to load access matrix");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
      setReports(data.reports ?? []);
      const first = data.users?.[0]?.id ?? "";
      setUserId(first);
      if (first) {
        const u = data.users.find((x: UserRow) => x.id === first);
        setSelected(new Set(u?.reportIds ?? []));
      }
      setLoading(false);
    })();
  }, []);

  const currentUser = useMemo(
    () => users.find((u) => u.id === userId) ?? null,
    [users, userId]
  );

  function onSelectUser(id: string) {
    setUserId(id);
    const u = users.find((x) => x.id === id);
    setSelected(new Set(u?.reportIds ?? []));
  }

  function toggle(reportId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(reports.map((r) => r.id)) : new Set());
  }

  function save() {
    if (!userId) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          reportIds: [...selected],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "Save failed");
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, reportIds: [...selected] } : u
        )
      );
      toast.success("Access updated");
    });
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium">
          Users
        </div>
        <div className="max-h-[70vh] overflow-auto">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onSelectUser(u.id)}
              className={
                u.id === userId
                  ? "block w-full border-b border-slate-100 bg-slate-50 px-3 py-2 text-left"
                  : "block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
              }
            >
              <div className="text-[13px] font-medium text-slate-900">
                {u.firstName} {u.lastName}
              </div>
              <div className="text-[11px] text-slate-500">
                {u.email}
                {u.role ? ` · ${displayRoleLabel(u.role)}` : ""}
              </div>
            </button>
          ))}
          {users.length === 0 && (
            <div className="px-3 py-4 text-sm text-slate-500">No users</div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <div>
            <div className="text-sm font-medium text-slate-900">
              Reports access
              {currentUser ? ` — ${currentUser.name}` : ""}
            </div>
            <div className="text-[11px] text-slate-500">
              Check reports the user may open and fill
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-slate-200 px-2 py-1 text-[12px] text-slate-600 hover:bg-slate-50"
              onClick={() => toggleAll(true)}
            >
              Select all
            </button>
            <button
              type="button"
              className="rounded border border-slate-200 px-2 py-1 text-[12px] text-slate-600 hover:bg-slate-50"
              onClick={() => toggleAll(false)}
            >
              Clear
            </button>
            <button
              type="button"
              disabled={!userId || pending}
              onClick={save}
              className="rounded bg-slate-900 px-3 py-1 text-[12px] text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] space-y-1 overflow-auto p-3">
          {reports.map((r) => {
            const checked = selected.has(r.id);
            return (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(r.id)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-[13px] text-slate-900">{r.name}</span>
                <span className="text-[11px] capitalize text-slate-500">
                  {r.status.replace("_", " ")}
                </span>
              </label>
            );
          })}
          {reports.length === 0 && (
            <div className="text-sm text-slate-500">No reports yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
