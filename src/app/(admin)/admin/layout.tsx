import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth/current-user";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { displayRoleLabel } from "@/lib/auth/roles";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user.role)) redirect("/access-denied");

  return (
    <div className="flex min-h-screen min-w-[1200px] bg-slate-100/70">
      <aside className="flex h-screen w-52 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 px-3 py-4">
          <div className="text-sm font-semibold tracking-tight text-slate-900">
            Admin
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">Campaign Monitor</div>
        </div>
        <AdminNav
          items={[
            { href: "/admin", label: "Dashboard", icon: "dashboard" },
            { href: "/admin/users", label: "Users", icon: "users" },
            { href: "/admin/reports", label: "Reports", icon: "reports" },
            { href: "/admin/access", label: "Access", icon: "access" },
            { href: "/admin/activity", label: "Activity", icon: "activity" },
            { href: "/admin/plan-history", label: "Plan history", icon: "history" },
            {
              href: "/admin/campaign-history",
              label: "Campaign audit",
              icon: "audit",
            },
            { href: "/admin/deleted", label: "Deleted", icon: "deleted" },
          ]}
        />
        <div className="border-t border-slate-200 p-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-slate-600 hover:bg-white hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to app
          </Link>
          <div className="mt-2 rounded-md border border-slate-200 bg-white px-2.5 py-2">
            <div className="text-xs font-medium text-slate-900">{user.name}</div>
            <div className="text-[10px] text-slate-500">
              {displayRoleLabel(user.role)}
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4">{children}</main>
    </div>
  );
}
