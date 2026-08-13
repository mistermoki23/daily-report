"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileBarChart2,
  KeyRound,
  Activity,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  reports: FileBarChart2,
  access: KeyRound,
  activity: Activity,
  history: History,
} as const;

export function AdminNav({
  items,
}: {
  items: {
    href: string;
    label: string;
    icon: keyof typeof ICONS;
  }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 p-2">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = ICONS[item.icon];
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
  );
}
