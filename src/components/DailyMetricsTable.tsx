"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculatedDiffTone,
  formatCalculated,
  formatCalculatedDifference,
  formatDisplayDate,
  formatKpiValue,
  formatNumber,
  formatPercent,
  isCumulativeKpi,
} from "@/lib/calculations";
import type {
  CalculatedMetricType,
  CurrencyCode,
  DailyCalculatedRow,
  DailyMetric,
  DailyRow,
  KpiType,
} from "@/lib/types";
import { CALCULATED_LABELS, KPI_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export function DailyMetricsTable({
  metrics,
  activeKpis,
  currency = "RUB",
  onEdit,
  calculatedRows,
}: {
  metrics: DailyMetric[];
  activeKpis: KpiType[];
  currency?: CurrencyCode | string;
  onEdit?: (metric: DailyMetric) => void;
  /** When provided, shows reach increment + calculated columns */
  calculatedRows?: DailyCalculatedRow[];
}) {
  const byDate = new Map(
    (calculatedRows ?? []).map((r) => [r.date, r] as const)
  );
  const showCalc = Boolean(calculatedRows && calculatedRows.length > 0);
  const calcKeys = (
    ["cpm", "ctr", "cpc", "vtr", "frequency", "cpa"] as CalculatedMetricType[]
  ).filter((key) => {
    if (!showCalc) return false;
    if (key === "cpm")
      return activeKpis.includes("spend") && activeKpis.includes("impressions");
    if (key === "ctr")
      return activeKpis.includes("clicks") && activeKpis.includes("impressions");
    if (key === "cpc")
      return activeKpis.includes("spend") && activeKpis.includes("clicks");
    if (key === "vtr")
      return (
        activeKpis.includes("video_views") && activeKpis.includes("impressions")
      );
    if (key === "frequency")
      return activeKpis.includes("reach") && activeKpis.includes("impressions");
    if (key === "cpa")
      return activeKpis.includes("spend") && activeKpis.includes("conversions");
    return false;
  });

  const colCount =
    activeKpis.length +
    (activeKpis.includes("reach") ? 1 : 0) +
    calcKeys.length +
    (onEdit ? 1 : 0) +
    1;

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 text-[11px]">Date</TableHead>
            {activeKpis.map((kpi) => (
              <TableHead key={kpi} className="h-8 text-[11px] text-right">
                {KPI_LABELS[kpi]}
                {kpi === "reach" ? " (cum.)" : ""}
              </TableHead>
            ))}
            {activeKpis.includes("reach") ? (
              <TableHead className="h-8 text-[11px] text-right">
                Reach incr.
              </TableHead>
            ) : null}
            {calcKeys.map((k) => (
              <TableHead key={k} className="h-8 text-[11px] text-right">
                {CALCULATED_LABELS[k]}
              </TableHead>
            ))}
            {onEdit ? <TableHead className="h-8 w-10 text-[11px]" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colCount}
                className="py-8 text-center text-sm text-slate-500"
              >
                Нет ежедневных данных
              </TableCell>
            </TableRow>
          ) : (
            metrics.map((m) => {
              const date = m.date.slice(0, 10);
              const calc = byDate.get(date);
              return (
                <TableRow key={m.id} className="text-sm">
                  <TableCell className="py-2 tabular-nums font-medium">
                    {formatDisplayDate(m.date, "dd.MM")}
                  </TableCell>
                  {activeKpis.map((kpi) => {
                    const value = m[kpi];
                    return (
                      <TableCell
                        key={kpi}
                        className="py-2 text-right tabular-nums"
                      >
                        {value != null
                          ? kpi === "spend"
                            ? formatKpiValue("spend", value, currency)
                            : formatNumber(value)
                          : "—"}
                      </TableCell>
                    );
                  })}
                  {activeKpis.includes("reach") ? (
                    <TableCell className="py-2 text-right tabular-nums">
                      {calc?.reachIncrement != null
                        ? formatNumber(calc.reachIncrement)
                        : "—"}
                    </TableCell>
                  ) : null}
                  {calcKeys.map((k) => (
                    <TableCell
                      key={k}
                      className="py-2 text-right tabular-nums"
                    >
                      {formatCalculated(
                        k,
                        calc?.calculated[k] ?? null,
                        currency
                      )}
                    </TableCell>
                  ))}
                  {onEdit ? (
                    <TableCell className="py-2">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => onEdit(m)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {calcKeys.includes("frequency") ? (
        <p className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">
          Daily Frequency = Impressions / Reach increment. Campaign Frequency =
          Total Impressions / Latest cumulative Reach.
        </p>
      ) : null}
    </div>
  );
}

export function DailyPerformanceTable({
  rows,
  kpiType,
  currency = "RUB",
  mode = "kpi",
  calculatedKey,
  showCumulative = false,
}: {
  rows: DailyRow[];
  kpiType?: KpiType;
  currency?: CurrencyCode | string;
  mode?: "kpi" | "calculated";
  calculatedKey?: CalculatedMetricType;
  /** Show Cumulative Plan / Cumulative Fact columns for additive KPIs */
  showCumulative?: boolean;
}) {
  const isReach = kpiType ? isCumulativeKpi(kpiType) : false;
  const isCalculated = mode === "calculated";
  const withCum = showCumulative && !isCalculated && !isReach;

  function formatFact(value: number) {
    if (isCalculated && calculatedKey) {
      return formatCalculated(calculatedKey, value, currency);
    }
    if (!kpiType) return formatNumber(value);
    return formatKpiValue(kpiType, value, currency);
  }

  function formatPlan(value: number) {
    if (isCalculated && calculatedKey) {
      return formatCalculated(calculatedKey, value, currency);
    }
    if (!kpiType) return formatNumber(Math.round(value));
    if (kpiType === "spend") return formatKpiValue("spend", value, currency);
    return formatNumber(Math.round(value));
  }

  function formatDiff(row: DailyRow) {
    if (!row.hasData) return "—";
    if (isCalculated && calculatedKey) {
      return formatCalculatedDifference(calculatedKey, row.difference, currency);
    }
    const sign = row.difference > 0 ? "+" : "";
    return `${sign}${formatPlan(row.difference)}`;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 text-[11px]">Date</TableHead>
            <TableHead className="h-8 text-[11px] text-right">
              {isCalculated
                ? "Plan"
                : isReach
                  ? "Reach Plan"
                  : "Daily Plan"}
            </TableHead>
            <TableHead className="h-8 text-[11px] text-right">
              {isCalculated ? "Fact" : isReach ? "Reach Fact" : "Fact"}
            </TableHead>
            <TableHead className="h-8 text-[11px] text-right">Difference</TableHead>
            {withCum ? (
              <TableHead className="h-8 text-[11px] text-right">
                Cumulative Plan
              </TableHead>
            ) : null}
            {withCum ? (
              <TableHead className="h-8 text-[11px] text-right">
                Cumulative Fact
              </TableHead>
            ) : null}
            {!isCalculated ? (
              <TableHead className="h-8 text-[11px] text-right">Pacing</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={withCum ? 7 : 5}
                className="py-8 text-center text-sm text-slate-500"
              >
                Нет данных
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const tone =
                isCalculated && calculatedKey
                  ? calculatedDiffTone(
                      calculatedKey,
                      row.hasData ? row.difference : null
                    )
                  : row.hasData && row.difference < 0
                    ? "bad"
                    : row.hasData && row.difference > 0
                      ? "good"
                      : "neutral";

              return (
                <TableRow
                  key={row.date}
                  className={`text-sm ${!row.hasData ? "bg-amber-50/40" : ""}`}
                >
                  <TableCell className="py-1.5 tabular-nums font-medium">
                    {formatDisplayDate(row.date, "dd.MM")}
                    {!row.hasData && !isCalculated ? (
                      <span className="ml-2 text-[10px] text-amber-600">
                        нет данных
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">
                    {formatPlan(row.dailyPlan)}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">
                    {row.hasData ? formatFact(row.actual) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "py-1.5 text-right tabular-nums",
                      tone === "good" && "text-emerald-700",
                      tone === "bad" && "text-rose-600"
                    )}
                  >
                    {formatDiff(row)}
                  </TableCell>
                  {withCum ? (
                    <TableCell className="py-1.5 text-right tabular-nums">
                      {formatPlan(row.cumulativePlan)}
                    </TableCell>
                  ) : null}
                  {withCum ? (
                    <TableCell className="py-1.5 text-right tabular-nums">
                      {row.hasData || row.cumulativeFact > 0
                        ? formatFact(row.cumulativeFact)
                        : "—"}
                    </TableCell>
                  ) : null}
                  {!isCalculated ? (
                    <TableCell className="py-1.5 text-right tabular-nums font-medium">
                      {formatPercent(row.pacing, 1)}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export { formatCalculated };
