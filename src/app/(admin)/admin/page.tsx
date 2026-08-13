import {
  getAdminDashboardStats,
} from "@/lib/admin/queries";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const cards = [
    { label: "Users", value: stats.usersCount },
    { label: "New registrations (7d)", value: stats.newRegistrations },
    { label: "Active users (30d)", value: stats.activeUsers },
    { label: "Reports", value: stats.reportsCount },
    { label: "Reports in progress", value: stats.reportsInProgress },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">
          Overview of users and campaign reports
        </p>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-slate-200 bg-white px-3 py-3"
          >
            <div className="text-[11px] text-slate-500">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
