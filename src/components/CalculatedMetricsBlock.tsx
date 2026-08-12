import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculatedDiffTone,
  formatCalculated,
  formatCalculatedDifference,
} from "@/lib/calculations";
import {
  CALCULATED_LABELS,
  type CalculatedMetricComparison,
  type CurrencyCode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function CalculatedMetricsBlock({
  comparisons,
  currency,
}: {
  comparisons: CalculatedMetricComparison[];
  currency: CurrencyCode | string;
}) {
  if (comparisons.length === 0) return null;

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="px-3 pb-2 pt-3">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Calculated metrics — Plan vs Fact
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="overflow-x-auto rounded-md border border-slate-100">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] text-slate-500">
                <th className="px-3 py-2 font-medium">Metric</th>
                <th className="px-3 py-2 text-right font-medium">Plan</th>
                <th className="px-3 py-2 text-right font-medium">Fact</th>
                <th className="px-3 py-2 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => {
                const tone = calculatedDiffTone(row.key, row.difference);
                return (
                  <tr
                    key={row.key}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-3 py-1.5 font-medium text-slate-800">
                      <span className="inline-flex items-center gap-1">
                        {CALCULATED_LABELS[row.key]}
                        {row.key === "frequency" ? (
                          <span
                            className="inline-flex text-slate-400"
                            title="Frequency = cumulative impressions / cumulative reach"
                          >
                            <Info className="h-3 w-3" aria-hidden />
                            <span className="sr-only">
                              Frequency = cumulative impressions / cumulative
                              reach
                            </span>
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">
                      {formatCalculated(row.key, row.plan, currency)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium text-slate-900">
                      {formatCalculated(row.key, row.fact, currency)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-1.5 text-right tabular-nums",
                        tone === "good" && "text-emerald-700",
                        tone === "bad" && "text-rose-600",
                        tone === "neutral" && "text-slate-700"
                      )}
                    >
                      {formatCalculatedDifference(
                        row.key,
                        row.difference,
                        currency
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          Δ для CTR/VTR — в percentage points (pp). Для CPM/CPC/CPA меньше обычно
          лучше.
        </p>
      </CardContent>
    </Card>
  );
}
