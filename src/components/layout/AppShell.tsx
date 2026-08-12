import { Sidebar } from "@/components/layout/Sidebar";
import { getSessionUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-screen min-w-[1200px] bg-slate-100/70">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
