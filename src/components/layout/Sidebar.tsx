"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  MonitorSmartphone,
  Settings,
  LogOut,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/platforms", label: "Platforms", icon: MonitorSmartphone },
  { href: "/daily-update", label: "Daily Update", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-3 py-4">
        <div className="text-sm font-semibold tracking-tight text-slate-900">
          Campaign Monitor
        </div>
        <div className="mt-0.5 text-[10px] text-slate-500">Media reporting</div>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                active
                  ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-2">
        <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
          <div className="text-xs font-medium text-slate-900">{user.name}</div>
          <div className="text-[10px] capitalize text-slate-500">{user.role}</div>
          <button
            type="button"
            onClick={() => {
              document.cookie = "cm_auth=; path=/; max-age=0";
              router.push("/login");
            }}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
          >
            <LogOut className="h-3 w-3" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
