import "server-only";

import { addDays } from "date-fns";
import {
  availableCalculatedMetrics,
  buildCalculatedComparisons,
  buildDailyRows,
  calculateMediaMetrics,
  calculatePlanMediaMetrics,
  isCumulativeKpi,
  parseDate,
  planValuesFromKpis,
  toDateString,
} from "@/lib/calculations";
import {
  KPI_TYPES,
  type CalculatedMetricComparison,
  type CampaignSummary,
  type CurrencyCode,
  type DailyRow,
  type KpiType,
} from "@/lib/types";
import {
  EXPORT_KPI_LABELS,
  formatExportFilename,
} from "@/lib/campaigns/export-shared";

export { EXPORT_KPI_LABELS, formatExportFilename, sanitizeCampaignFilename, campaignDatePresets } from "@/lib/campaigns/export-shared";

export type ExportDailyKpiCell = {
  plan: number;
  fact: number | null;
  difference: number | null;
};

export type ExportKpiSummaryRow = {
  kpi: KpiType;
  label: string;
  plan: number;
  fact: number | null;
  difference: number | null;
  pacing: number | null;
};

export type ExportDailyTableRow = {
  date: string;
  values: Record<KpiType, ExportDailyKpiCell>;
};

export type CampaignExportModel = {
  campaignName: string;
  clientName: string;
  platformName: string;
  currency: CurrencyCode;
  campaignStart: string;
  campaignEnd: string;
  exportStart: string;
  exportEnd: string;
  selectedKpis: KpiType[];
  kpiRows: ExportKpiSummaryRow[];
  calculated: CalculatedMetricComparison[];
  dailyRows: ExportDailyTableRow[];
  dailyTotal: Record<KpiType, ExportDailyKpiCell>;
  filename: string;
};

function clampDate(value: string, min: string, max: string): string {
  const d = value.slice(0, 10);
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

function datesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let cursor = parseDate(startDate);
  const end = parseDate(endDate);
  while (cursor.getTime() <= end.getTime()) {
    dates.push(toDateString(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function resolveExportRange(
  campaignStart: string,
  campaignEnd: string,
  startDate: string,
  endDate: string
): { start: string; end: string } {
  const cs = campaignStart.slice(0, 10);
  const ce = campaignEnd.slice(0, 10);
  if (!startDate || !endDate || Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
    throw new Error("Даты экспорта некорректны");
  }
  if (endDate.slice(0, 10) < startDate.slice(0, 10)) {
    throw new Error("Дата окончания не может быть раньше даты начала");
  }
  const start = clampDate(startDate, cs, ce);
  const end = clampDate(endDate, cs, ce);
  if (end < start) {
    throw new Error("Выбранный период не пересекается с периодом кампании");
  }
  return { start, end };
}

export function buildCampaignExportModel(
  summary: CampaignSummary,
  input: { startDate: string; endDate: string; kpis: KpiType[] }
): CampaignExportModel {
  const campaign = summary.campaign;
  const { start, end } = resolveExportRange(
    campaign.start_date,
    campaign.end_date,
    input.startDate,
    input.endDate
  );

  const campaignKpis = campaign.kpis.map((k) => k.kpi_type);
  const selectedKpis = KPI_TYPES.filter(
    (k) => campaignKpis.includes(k) && input.kpis.includes(k)
  );
  if (selectedKpis.length === 0) {
    throw new Error("Выберите хотя бы одну метрику");
  }

  const isFullPeriod =
    start === campaign.start_date.slice(0, 10) &&
    end === campaign.end_date.slice(0, 10);

  const planned = planValuesFromKpis(campaign.kpis);
  const byKpiRows = new Map<KpiType, DailyRow[]>();
  for (const kpi of selectedKpis) {
    const planValue = planned[kpi] ?? 0;
    const rows = buildDailyRows(
      campaign,
      planValue,
      kpi,
      campaign.daily_metrics
    ).filter((r) => r.date >= start && r.date <= end);
    byKpiRows.set(kpi, rows);
  }

  const kpiRows: ExportKpiSummaryRow[] = selectedKpis.map((kpi) => {
    const pageMetrics = summary.allMetrics.find((m) => m.kpiType === kpi);
    const rows = byKpiRows.get(kpi) ?? [];

    if (isFullPeriod && pageMetrics) {
      const fact = pageMetrics.hasFact ? pageMetrics.totalFact : null;
      return {
        kpi,
        label: EXPORT_KPI_LABELS[kpi],
        plan: pageMetrics.totalPlan,
        fact,
        difference: fact == null ? null : fact - pageMetrics.totalPlan,
        pacing: pageMetrics.pacing,
      };
    }

    if (isCumulativeKpi(kpi)) {
      const last = [...rows].reverse().find((r) => r.hasData) ?? rows[rows.length - 1];
      const plan = last?.dailyPlan ?? 0;
      const fact = last?.hasData ? last.actual : null;
      return {
        kpi,
        label: EXPORT_KPI_LABELS[kpi],
        plan,
        fact,
        difference: fact == null ? null : fact - plan,
        pacing: plan > 0 && fact != null ? (fact / plan) * 100 : null,
      };
    }

    const plan = rows.reduce((sum, r) => sum + r.dailyPlan, 0);
    const hasFact = rows.some((r) => r.hasData);
    const fact = hasFact ? rows.reduce((sum, r) => sum + (r.hasData ? r.actual : 0), 0) : null;
    return {
      kpi,
      label: EXPORT_KPI_LABELS[kpi],
      plan,
      fact,
      difference: fact == null ? null : fact - plan,
      pacing: plan > 0 && fact != null ? (fact / plan) * 100 : null,
    };
  });

  let calculated: CalculatedMetricComparison[];
  if (isFullPeriod) {
    const allowed = new Set(availableCalculatedMetrics(selectedKpis));
    calculated = summary.calculatedComparisons.filter((c) => allowed.has(c.key));
  } else {
    const periodPlans: Partial<Record<KpiType, number>> = {};
    const periodFacts: Partial<Record<KpiType, number>> = {};
    for (const row of kpiRows) {
      periodPlans[row.kpi] = row.plan;
      if (row.fact != null) periodFacts[row.kpi] = row.fact;
    }
    const planMetrics = calculatePlanMediaMetrics(periodPlans, selectedKpis);
    const factMetrics = calculateMediaMetrics({
      impressions: periodFacts.impressions ?? 0,
      reach: selectedKpis.includes("reach") ? periodFacts.reach ?? null : null,
      clicks: periodFacts.clicks ?? 0,
      spend: periodFacts.spend ?? 0,
      conversions: periodFacts.conversions ?? 0,
      videoViews: periodFacts.video_views ?? 0,
      activeKpis: selectedKpis,
    });
    calculated = buildCalculatedComparisons(planMetrics, factMetrics, selectedKpis);
  }

  const dates = datesInRange(start, end);
  const dailyRows: ExportDailyTableRow[] = dates.map((date) => {
    const values = {} as Record<KpiType, ExportDailyKpiCell>;
    for (const kpi of selectedKpis) {
      const row = (byKpiRows.get(kpi) ?? []).find((r) => r.date === date);
      if (!row) {
        values[kpi] = { plan: 0, fact: null, difference: null };
        continue;
      }
      values[kpi] = {
        plan: row.dailyPlan,
        fact: row.hasData ? row.actual : null,
        difference: row.hasData ? row.difference : null,
      };
    }
    return { date, values };
  });

  const dailyTotal = {} as Record<KpiType, ExportDailyKpiCell>;
  for (const kpi of selectedKpis) {
    if (isCumulativeKpi(kpi)) {
      const last = [...dailyRows].reverse().find((r) => r.values[kpi].fact != null) ??
        dailyRows[dailyRows.length - 1];
      dailyTotal[kpi] = last
        ? last.values[kpi]
        : { plan: 0, fact: null, difference: null };
      continue;
    }
    const plan = dailyRows.reduce((sum, r) => sum + r.values[kpi].plan, 0);
    const hasFact = dailyRows.some((r) => r.values[kpi].fact != null);
    const fact = hasFact
      ? dailyRows.reduce((sum, r) => sum + (r.values[kpi].fact ?? 0), 0)
      : null;
    dailyTotal[kpi] = {
      plan,
      fact,
      difference: fact == null ? null : fact - plan,
    };
  }

  return {
    campaignName: campaign.name,
    clientName: campaign.client.name,
    platformName: campaign.platform.name,
    currency: campaign.currency,
    campaignStart: campaign.start_date.slice(0, 10),
    campaignEnd: campaign.end_date.slice(0, 10),
    exportStart: start,
    exportEnd: end,
    selectedKpis,
    kpiRows,
    calculated,
    dailyRows,
    dailyTotal,
    filename: formatExportFilename(campaign.name, start, end),
  };
}
