import { listCampaignChangeHistory } from "@/lib/campaigns/manage";

export const dynamic = "force-dynamic";

export default async function AdminCampaignHistoryPage() {
  const rows = await listCampaignChangeHistory(200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Campaign audit</h1>
        <p className="text-sm text-slate-500">
          История EDIT / DELETE / RESTORE по полям кампаний
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Campaign</th>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">Old</th>
              <th className="px-3 py-2 font-medium">New</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 text-slate-600">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 font-medium text-slate-800">{r.action}</td>
                <td className="px-3 py-2">
                  <div className="text-slate-900">{r.user.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {r.userEmail}
                    <span className="text-slate-400"> · {r.userId.slice(0, 8)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-800">
                  <div>{r.campaign.name}</div>
                  <div className="text-[11px] text-slate-400">{r.campaignId.slice(0, 8)}</div>
                </td>
                <td className="px-3 py-2 text-slate-700">{r.fieldLabel}</td>
                <td className="px-3 py-2 text-slate-600">
                  {r.oldValue == null || r.oldValue === "" ? "—" : r.oldValue}
                </td>
                <td className="px-3 py-2 text-slate-900">
                  {r.newValue == null || r.newValue === "" ? "—" : r.newValue}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No campaign changes yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
