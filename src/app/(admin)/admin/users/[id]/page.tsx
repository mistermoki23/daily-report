import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUserDetail } from "@/lib/admin/queries";
import { RoleSelect } from "@/components/admin/RoleSelect";

type Params = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Params) {
  const { id } = await params;
  const user = await getAdminUserDetail(id);
  if (!user) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/users" className="text-[12px] text-slate-500 hover:text-slate-800">
          ← Users
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-sm text-slate-500">{user.email}</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] text-slate-500">Role</div>
          <RoleSelect userId={user.id} currentRole={user.role} />
        </div>
        <Meta
          label="Registered"
          value={new Date(user.registeredAt).toLocaleDateString()}
        />
        <Meta
          label="Last login"
          value={
            user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleString()
              : "—"
          }
        />
        <Meta label="Status" value={user.active ? "Active" : "Inactive"} />
      </div>

      <ReportSection title="Available reports" rows={user.availableReports} />
      <ReportSection title="Opened reports" rows={user.openedReports} />
      <ReportSection title="Started filling" rows={user.startedReports} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function ReportSection({
  title,
  rows,
}: {
  title: string;
  rows: {
    id: string;
    name: string;
    status: string;
    progress: number;
    lastChangedAt: string;
  }[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium text-slate-900">
        {title}
      </div>
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Report</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Progress</th>
            <th className="px-3 py-2 font-medium">Last change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-2 text-slate-900">{r.name}</td>
              <td className="px-3 py-2 capitalize text-slate-600">
                {r.status.replace("_", " ")}
              </td>
              <td className="px-3 py-2 tabular-nums text-slate-700">
                {r.progress}%
              </td>
              <td className="px-3 py-2 text-slate-600">
                {new Date(r.lastChangedAt).toLocaleString()}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                None
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
