import { listAdminReports } from "@/lib/admin/queries";

export default async function AdminReportsPage() {
  const reports = await listAdminReports();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">
          All campaigns (reports) in the system
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Users with access</th>
              <th className="px-3 py-2 font-medium">Started filling</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 font-medium text-slate-900">{r.name}</td>
                <td className="px-3 py-2 tabular-nums text-slate-700">
                  {r.accessCount}
                </td>
                <td className="px-3 py-2 tabular-nums text-slate-700">
                  {r.startedCount}
                </td>
                <td className="px-3 py-2 capitalize text-slate-600">
                  {r.status.replace("_", " ")}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {new Date(r.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No reports yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
