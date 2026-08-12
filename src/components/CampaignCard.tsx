import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function CampaignCard({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
}) {
  const valueColor =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "danger"
          ? "text-rose-700"
          : tone === "muted"
            ? "text-slate-500"
            : "text-slate-900";

  return (
    <Card className={cn("border-slate-200 shadow-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pb-1 pt-3">
        <CardTitle className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {title}
        </CardTitle>
        {Icon ? <Icon className="h-3.5 w-3.5 text-slate-400" /> : null}
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className={cn("text-xl font-semibold tabular-nums leading-none", valueColor)}>
          {value}
        </div>
        {subtitle ? (
          <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
