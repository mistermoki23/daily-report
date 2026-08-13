"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type DeletedCampaign = {
  id: string;
  name: string;
  clientName: string;
  platformName: string;
  deletedAt: string;
  status: string;
  primaryKpi: string;
};

export function DeletedCampaignsTable({
  initial,
}: {
  initial: DeletedCampaign[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function onRestore(id: string) {
    setError("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка восстановления");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Client</th>
              <th className="px-3 py-2 font-medium">Platform</th>
              <th className="px-3 py-2 font-medium">Deleted</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 font-medium text-slate-900">{r.name}</td>
                <td className="px-3 py-2 text-slate-700">{r.clientName}</td>
                <td className="px-3 py-2 text-slate-700">{r.platformName}</td>
                <td className="px-3 py-2 text-slate-600">
                  {new Date(r.deletedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === r.id}
                    onClick={() => onRestore(r.id)}
                  >
                    {busyId === r.id ? "..." : "Restore"}
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No deleted campaigns
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
