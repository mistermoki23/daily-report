import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "default",
}: {
  value: number;
  className?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const bar =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-rose-500"
          : "bg-slate-700";

  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full rounded-full transition-all", bar)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
