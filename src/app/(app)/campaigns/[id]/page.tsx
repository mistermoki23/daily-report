"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonVariants, Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { KpiCard } from "@/components/KpiCard";
import { CalculatedMetricsBlock } from "@/components/CalculatedMetricsBlock";
import { CampaignChart } from "@/components/CampaignChart";
import { DailyMetricsTable, DailyPerformanceTable } from "@/components/DailyMetricsTable";
import { EditPlanDialog } from "@/components/EditPlanDialog";
import { EditCampaignDialog } from "@/components/EditCampaignDialog";
import { DeleteCampaignDialog } from "@/components/DeleteCampaignDialog";
import { ExportCampaignDialog } from "@/components/ExportCampaignDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  availableCalculatedMetrics,
  buildCalculatedDailyRows,
  buildChartPoints,
  buildDailyCalculatedRows,
  buildDailyRows,
  formatDisplayDate,
  formatFullDate,
  formatKpiValue,
  formatNumber,
  isCumulativeKpi,
  totalCampaignDays,
} from "@/lib/calculations";
import { cn } from "@/lib/utils";
import {
  CALCULATED_LABELS,
  getCurrency,
  KPI_LABELS,
  type CalculatedMetricType,
  type CampaignSummary,
  type ChartPoint,
  type KpiType,
} from "@/lib/types";
import { useCanDelete, useCanWrite } from "@/components/auth/CurrentUserProvider";

type TabId = KpiType | CalculatedMetricType;

function isKpiTab(id: string, active: KpiType[]): id is KpiType {
  return active.includes(id as KpiType);
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabId | null>(null);
  const [error, setError] = useState("");
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editCampaignOpen, setEditCampaignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const canWrite = useCanWrite();
  const canDelete = useCanDelete();

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/campaigns/${params.id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не найдено");
        return;
      }
      setSummary(data);
      setSelectedTab((prev) => prev ?? data.primaryKpi);
    }
    load();

    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [params.id]);

  const activeKpis = useMemo(
    () => summary?.campaign.kpis.map((k) => k.kpi_type) ?? [],
    [summary]
  );
  const calcKeys = useMemo(
    () => (summary ? availableCalculatedMetrics(activeKpis) : []),
    [summary, activeKpis]
  );

  const activeTab = selectedTab ?? summary?.primaryKpi ?? null;
  const currency = summary?.campaign.currency ?? "RUB";

  const performance = useMemo(() => {
    if (!summary || !activeTab) {
      return { rows: [], chart: [] as ChartPoint[], mode: "daily" as const, title: "" };
    }

    if (isKpiTab(activeTab, activeKpis)) {
      const plan = summary.campaign.kpis.find((k) => k.kpi_type === activeTab);
      if (!plan) {
        return { rows: [], chart: [] as ChartPoint[], mode: "daily" as const, title: "" };
      }
      const rows = buildDailyRows(
        summary.campaign,
        plan.planned_value,
        activeTab,
        summary.campaign.daily_metrics
      );
      const chart = buildChartPoints(
        summary.campaign,
        plan.planned_value,
        activeTab,
        summary.campaign.daily_metrics
      );
      const cumulative = isCumulativeKpi(activeTab);
      return {
        rows,
        chart,
        mode: cumulative ? ("cumulative" as const) : ("daily" as const),
        title: `${KPI_LABELS[activeTab]} Performance`,
        kpiType: activeTab,
        calculatedKey: undefined as CalculatedMetricType | undefined,
      };
    }

    const plans = Object.fromEntries(
      summary.campaign.kpis.map((k) => [k.kpi_type, k.planned_value])
    ) as Partial<Record<KpiType, number>>;

    const rows = buildCalculatedDailyRows(
      summary.campaign,
      summary.campaign.daily_metrics,
      activeKpis,
      activeTab as CalculatedMetricType,
      plans
    );
    const chart: ChartPoint[] = rows.map((r) => ({
      date: r.date,
      label: formatDisplayDate(r.date, "d MMM"),
      expectedCumulative: r.dailyPlan,
      actualCumulative: r.hasData ? r.actual : null,
      dailyPlan: r.dailyPlan,
      dailyFact: r.hasData ? r.actual : null,
    }));

    return {
      rows,
      chart,
      mode: "daily" as const,
      title: `${CALCULATED_LABELS[activeTab as CalculatedMetricType]} Performance`,
      kpiType: undefined as KpiType | undefined,
      calculatedKey: activeTab as CalculatedMetricType,
    };
  }, [summary, activeTab, activeKpis]);

  if (error) return <div className="text-sm text-rose-600">{error}</div>;
  if (!summary) return <div className="text-sm text-slate-500">Загрузка...</div>;

  const { campaign, allMetrics, metrics, missingDays, status, calculatedComparisons, primaryKpi } =
    summary;
  const days = totalCampaignDays(campaign.start_date, campaign.end_date);
  const currencyLabel = getCurrency(currency).label;
  const dailyPlanHint =
    metrics && !metrics.isCumulative
      ? `${formatKpiValue(metrics.kpiType, metrics.dailyPlan, currency)} / день`
      : null;

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/campaigns" className="text-sm text-slate-500 hover:text-slate-800">
            ← Campaigns
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">{campaign.name}</h1>
            <StatusBadge status={status} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              Client: <span className="text-slate-800">{campaign.client.name}</span>
            </span>
            <span>
              Platform: <span className="text-slate-800">{campaign.platform.name}</span>
            </span>
            <span>
              Currency: <span className="text-slate-800">{currencyLabel}</span>
            </span>
            <span>
              Primary KPI:{" "}
              <span className="text-slate-800">{KPI_LABELS[primaryKpi]}</span>
            </span>
            <span>
              Period:{" "}
              <span className="text-slate-800">
                {formatDisplayDate(campaign.start_date)} —{" "}
                {formatDisplayDate(campaign.end_date)} ({days} дн.)
              </span>
            </span>
          </div>
          {missingDays > 0 && status !== "completed" ? (
            <p className="mt-1.5 text-sm text-amber-700">
              Missing data: {missingDays} {missingDays === 1 ? "day" : "days"}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {canWrite ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditCampaignOpen(true)}
              >
                Редактировать кампанию
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditPlanOpen(true)}
              >
                Редактировать план
              </Button>
            </>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              onClick={() => setDeleteOpen(true)}
            >
              Удалить
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExportOpen(true)}
          >
            Экспорт в Excel
          </Button>
          <Link
            href={`/campaigns/${campaign.id}/daily`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Daily data
          </Link>
        </div>
      </div>

      <EditCampaignDialog
        open={editCampaignOpen}
        onOpenChange={setEditCampaignOpen}
        summary={summary}
        onSaved={(next) => {
          setSummary(next);
          setSelectedTab((prev) => prev ?? next.primaryKpi);
        }}
      />

      <EditPlanDialog
        open={editPlanOpen}
        onOpenChange={setEditPlanOpen}
        summary={summary}
        onSaved={(next) => {
          setSummary(next);
          setSelectedTab((prev) => prev ?? next.primaryKpi);
        }}
      />

      <DeleteCampaignDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        campaignId={campaign.id}
        campaignName={campaign.name}
      />

      <ExportCampaignDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        summary={summary}
      />

      {/* 2. KPI Summary */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            KPI Summary
          </h2>
          {dailyPlanHint ? (
            <span className="text-[11px] text-slate-400">
              Daily plan ({KPI_LABELS[primaryKpi]}): {dailyPlanHint}
            </span>
          ) : null}
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {allMetrics.map((m) => (
            <KpiCard
              key={m.kpiType}
              metrics={m}
              currency={currency}
              isPrimary={m.kpiType === primaryKpi}
            />
          ))}
        </div>
      </section>

      {/* 3. Calculated Metrics */}
      <CalculatedMetricsBlock
        comparisons={calculatedComparisons}
        currency={currency}
      />

      {/* 4–5. Performance Chart + Daily Performance Table */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Daily Performance
        </h2>
        <Tabs
          value={activeTab ?? undefined}
          onValueChange={(v) => setSelectedTab(v as TabId)}
        >
          <TabsList className="flex h-auto flex-wrap gap-1">
            {campaign.kpis.map((k) => (
              <TabsTrigger key={k.kpi_type} value={k.kpi_type}>
                {KPI_LABELS[k.kpi_type]}
              </TabsTrigger>
            ))}
            {calcKeys.map((key) => (
              <TabsTrigger key={key} value={key}>
                {CALCULATED_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>

          {[...campaign.kpis.map((k) => k.kpi_type), ...calcKeys].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {tab === activeTab ? (
                <>
                  <CampaignChart
                    data={performance.chart}
                    title={performance.title}
                    mode={
                      performance.calculatedKey
                        ? "daily"
                        : performance.mode === "cumulative"
                          ? "cumulative"
                          : "daily"
                    }
                    subtitle={
                      performance.calculatedKey
                        ? performance.calculatedKey === "frequency"
                          ? "Plan Frequency vs Fact (cum. Imp / cum. Reach)"
                          : "Plan vs Fact по дням"
                        : performance.mode === "cumulative"
                          ? "Cumulative Reach Plan vs Fact"
                          : "Сколько запланировано на день vs сколько получили"
                    }
                  />
                  <div>
                    <h3 className="mb-1.5 text-sm font-semibold text-slate-800">
                      Daily performance table
                    </h3>
                    {performance.kpiType && !isCumulativeKpi(performance.kpiType) ? (
                      <p className="mb-2 text-xs text-slate-500">
                        Daily Plan ={" "}
                        {formatNumber(
                          Math.round(
                            (campaign.kpis.find((k) => k.kpi_type === performance.kpiType)
                              ?.planned_value ?? 0) / days
                          )
                        )}{" "}
                        ({formatNumber(
                          campaign.kpis.find((k) => k.kpi_type === performance.kpiType)
                            ?.planned_value ?? 0
                        )}{" "}
                        ÷ {days} дней)
                      </p>
                    ) : null}
                    <DailyPerformanceTable
                      rows={performance.rows}
                      kpiType={performance.kpiType}
                      currency={currency}
                      mode={performance.calculatedKey ? "calculated" : "kpi"}
                      calculatedKey={performance.calculatedKey}
                      showCumulative={
                        Boolean(performance.kpiType) &&
                        !performance.calculatedKey
                      }
                    />
                  </div>
                </>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* 6. Daily Data overview + link to edit */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Daily Data
          </h2>
          <Link
            href={`/campaigns/${campaign.id}/daily`}
            className="text-xs text-slate-600 underline hover:text-slate-900"
          >
            {canWrite ? "Редактировать факты →" : "Открыть Daily Data →"}
          </Link>
        </div>
        <DailyMetricsTable
          metrics={campaign.daily_metrics}
          activeKpis={activeKpis}
          currency={currency}
          calculatedRows={buildDailyCalculatedRows(
            campaign,
            campaign.daily_metrics,
            activeKpis
          ).filter((r) => r.hasData)}
        />
      </section>

      <Card className="border-slate-200 shadow-none">
        <CardHeader className="px-4 pb-2 pt-3">
          <CardTitle className="text-sm font-semibold">PLAN overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 px-4 pb-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {campaign.kpis.map((k) => (
            <div key={k.id}>
              <div className="text-[10px] uppercase text-slate-400">
                Total {KPI_LABELS[k.kpi_type]}
              </div>
              <div className="font-medium tabular-nums">
                {formatKpiValue(k.kpi_type, k.planned_value, currency)}
              </div>
            </div>
          ))}
          <div>
            <div className="text-[10px] uppercase text-slate-400">Start</div>
            <div className="font-medium">{formatFullDate(campaign.start_date)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400">End</div>
            <div className="font-medium">{formatFullDate(campaign.end_date)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400">Days</div>
            <div className="font-medium tabular-nums">{days}</div>
          </div>
          {metrics ? (
            <div>
              <div className="text-[10px] uppercase text-slate-400">Fact / Remaining days</div>
              <div className="font-medium tabular-nums">
                {metrics.daysFact} / {metrics.daysRemaining}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
