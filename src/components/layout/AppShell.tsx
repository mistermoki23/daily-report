import { Sidebar } from "@/components/layout/Sidebar";
import { db } from "@/lib/db";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await db.getUser();
  return (
    <div className="flex min-h-screen min-w-[1200px] bg-slate-100/70">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
