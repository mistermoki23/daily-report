import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ProgressBar";
import { formatKpiValue, formatPercent } from "@/lib/calculations";
import { KPI_LABELS, type CurrencyCode, type KpiMetrics } from "@/lib/types";

export function KpiCard({
  metrics,
  currency = "RUB",
  isPrimary = false,
}: {
  metrics: KpiMetrics;
  currency?: CurrencyCode | string;
  isPrimary?: boolean;
}) {
  const pacingTone =
    metrics.pacing === null
      ? "default"
      : metrics.pacing >= 95
        ? "success"
        : metrics.pacing >= 80
          ? "warning"
          : "danger";

  return (
    <Card className={`border-slate-200 shadow-none ${isPrimary ? "ring-1 ring-slate-300" : ""}`}>
      <CardHeader className="px-3 pb-1 pt-3">
        <CardTitle className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span>{KPI_LABELS[metrics.kpiType]}</span>
          {isPrimary ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium normal-case text-slate-600">
              Primary
            </span>
          ) : null}
          {metrics.isCumulative ? (
            <span className="text-[9px] font-normal normal-case text-slate-400">cumulative</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <div>
            <div className="text-[10px] uppercase text-slate-400">Plan</div>
            <div className="text-sm font-medium tabular-nums text-slate-900">
              {formatKpiValue(metrics.kpiType, metrics.totalPlan, currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400">Fact</div>
            <div className="text-sm font-medium tabular-nums text-slate-900">
              {metrics.hasFact && metrics.totalFact !== null
                ? formatKpiValue(metrics.kpiType, metrics.totalFact, currency)
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400">Remaining</div>
            <div className="text-sm font-medium tabular-nums text-slate-900">
              {formatKpiValue(metrics.kpiType, metrics.remaining, currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400">Pacing</div>
            <div
              className={`text-sm font-semibold tabular-nums ${
                pacingTone === "success"
                  ? "text-emerald-700"
                  : pacingTone === "warning"
                    ? "text-amber-700"
                    : pacingTone === "danger"
                      ? "text-rose-700"
                      : "text-slate-700"
              }`}
            >
              {formatPercent(metrics.pacing)}
            </div>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Progress</span>
            <span className="tabular-nums">{formatPercent(metrics.progress)}</span>
          </div>
          <ProgressBar
            value={metrics.progress}
            tone={pacingTone === "default" ? "default" : pacingTone}
          />
        </div>
      </CardContent>
    </Card>
  );
}
