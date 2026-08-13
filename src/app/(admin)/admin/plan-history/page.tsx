import { listPlanChangeHistory } from "@/lib/campaigns/update-plan";
import { formatNumber } from "@/lib/calculations";

export const dynamic = "force-dynamic";

export default async function AdminPlanHistoryPage() {
  const rows = await listPlanChangeHistory(200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Plan changes</h1>
        <p className="text-sm text-slate-500">
          История изменений плановых KPI кампаний
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Campaign</th>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium text-right">Old</th>
              <th className="px-3 py-2 font-medium text-right">New</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 text-slate-600">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <div className="text-slate-900">{r.user.name}</div>
                  <div className="text-[11px] text-slate-500">{r.userEmail}</div>
                </td>
                <td className="px-3 py-2 text-slate-800">{r.campaign.name}</td>
                <td className="px-3 py-2 text-slate-700">{r.fieldLabel}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                  {r.oldValue == null ? "—" : formatNumber(r.oldValue)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-900">
                  {r.newValue == null ? "—" : formatNumber(r.newValue)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  No plan changes yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
