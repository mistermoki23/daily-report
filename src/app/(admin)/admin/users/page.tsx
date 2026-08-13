import Link from "next/link";
import { listAdminUsers } from "@/lib/admin/queries";

export default async function AdminUsersPage() {
  const users = await listAdminUsers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500">All registered accounts</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">First name</th>
              <th className="px-3 py-2 font-medium">Last name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Registered</th>
              <th className="px-3 py-2 font-medium">Last login</th>
              <th className="px-3 py-2 font-medium">Reports</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {u.firstName || "—"}
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-700">{u.lastName || "—"}</td>
                <td className="px-3 py-2 text-slate-700">{u.email}</td>
                <td className="px-3 py-2 text-slate-600">
                  {new Date(u.registeredAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleString()
                    : "—"}
                </td>
                <td className="px-3 py-2 tabular-nums text-slate-700">
                  {u.reportsAvailable}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      u.active
                        ? "rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700"
                        : "rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                    }
                  >
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
