import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@/lib/config/pacing";
import { STATUS_LABELS } from "@/lib/config/pacing";

const styles: Record<CampaignStatus, string> = {
  on_track: "bg-emerald-50 text-emerald-700 border-emerald-200",
  attention: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
};

export function StatusBadge({
  status,
  className,
}: {
  status: CampaignStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        styles[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
