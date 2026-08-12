import {
  addDays,
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import { ru } from "date-fns/locale";
import { statusFromPacing, type CampaignStatus } from "@/lib/config/pacing";
import type {
  CalculatedMetricComparison,
  CalculatedMetricType,
  CalculatedMetrics,
  Campaign,
  CampaignKpi,
  CampaignSummary,
  CampaignWithRelations,
  ChartPoint,
  CurrencyCode,
  DailyCalculatedRow,
  DailyMetric,
  DailyRow,
  KpiMetrics,
  KpiType,
} from "@/lib/types";
import {
  CUMULATIVE_KPIS,
  getCurrency,
  KPI_TYPES,
} from "@/lib/types";

export function parseDate(value: string): Date {
  return startOfDay(parseISO(value.slice(0, 10)));
}

export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDisplayDate(value: string, pattern = "dd.MM"): string {
  return format(parseDate(value), pattern, { locale: ru });
}

export function formatFullDate(value: string): string {
  return format(parseDate(value), "d MMM yyyy", { locale: ru });
}

export function totalCampaignDays(startDate: string, endDate: string): number {
  return differenceInCalendarDays(parseDate(endDate), parseDate(startDate)) + 1;
}

export function getDaysFact(
  startDate: string,
  endDate: string,
  today: Date = new Date()
): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const now = startOfDay(today);

  if (isBefore(now, start)) return 0;
  const effectiveEnd = isAfter(now, end) ? end : now;
  return differenceInCalendarDays(effectiveEnd, start) + 1;
}

export function getDaysRemaining(
  startDate: string,
  endDate: string,
  today: Date = new Date()
): number {
  const total = totalCampaignDays(startDate, endDate);
  const fact = getDaysFact(startDate, endDate, today);
  return Math.max(0, total - fact);
}

export function getExpectedDateRange(
  startDate: string,
  endDate: string,
  today: Date = new Date()
): string[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const now = startOfDay(today);
  const last = isAfter(now, end) ? end : isBefore(now, start) ? addDays(start, -1) : now;
  const dates: string[] = [];
  if (isBefore(last, start)) return dates;
  let cursor = start;
  while (!isAfter(cursor, last)) {
    dates.push(toDateString(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function getMissingDates(
  startDate: string,
  endDate: string,
  dailyMetrics: DailyMetric[],
  today: Date = new Date()
): string[] {
  const expected = getExpectedDateRange(startDate, endDate, today);
  const present = new Set(dailyMetrics.map((m) => m.date.slice(0, 10)));
  return expected.filter((d) => !present.has(d));
}

export function isCampaignCompleted(
  endDate: string,
  today: Date = new Date()
): boolean {
  return isAfter(startOfDay(today), parseDate(endDate));
}

export function isCumulativeKpi(kpiType: KpiType): boolean {
  return CUMULATIVE_KPIS.includes(kpiType);
}

export function getKpiValueFromDaily(
  metric: DailyMetric,
  kpiType: KpiType
): number | null {
  const value = metric[kpiType];
  return typeof value === "number" ? value : null;
}

/**
 * Report "as of" date: calendar today, but never earlier than the latest
 * saved daily row. Lets future-dated campaign data (e.g. Sep while today is Aug)
 * enter FACT / calculated aggregates.
 */
export function resolveReportDate(
  dailyMetrics: DailyMetric[],
  today: Date = new Date()
): Date {
  let latest = toDateString(today);
  for (const m of dailyMetrics) {
    const d = m.date.slice(0, 10);
    if (d > latest) latest = d;
  }
  return parseDate(latest);
}

export function resolveReportAsOf(
  dailyMetrics: DailyMetric[],
  today: Date = new Date()
): string {
  return toDateString(resolveReportDate(dailyMetrics, today));
}

/** True if at least one daily row has a non-null value for this KPI (on/before asOf). */
export function hasDailyKpiValue(
  dailyMetrics: DailyMetric[],
  kpiType: KpiType,
  asOfDate?: string
): boolean {
  const asOf = asOfDate ?? resolveReportAsOf(dailyMetrics);
  return dailyMetrics.some((m) => {
    if (m.date.slice(0, 10) > asOf) return false;
    return getKpiValueFromDaily(m, kpiType) !== null;
  });
}

/** SUM for summable KPIs; latest non-null for cumulative (Reach). Excludes dates after asOf. */
export function getFactValue(
  dailyMetrics: DailyMetric[],
  kpiType: KpiType,
  asOfDate?: string
): number {
  const asOf = asOfDate ?? resolveReportAsOf(dailyMetrics);
  const sorted = [...dailyMetrics]
    .filter((m) => m.date.slice(0, 10) <= asOf)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (isCumulativeKpi(kpiType)) {
    for (let i = sorted.length - 1; i >= 0; i--) {
      const v = getKpiValueFromDaily(sorted[i], kpiType);
      if (v !== null) return v;
    }
    return 0;
  }
  return sorted.reduce((sum, row) => {
    const v = getKpiValueFromDaily(row, kpiType);
    return sum + (v ?? 0);
  }, 0);
}

/** Latest cumulative reach on/before asOf, or null if missing */
export function getCumulativeReach(
  dailyMetrics: DailyMetric[],
  asOfDate?: string
): number | null {
  const asOf = asOfDate ?? resolveReportAsOf(dailyMetrics);
  const sorted = [...dailyMetrics]
    .filter((m) => m.date.slice(0, 10) <= asOf)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].reach != null) return sorted[i].reach;
  }
  return null;
}

export function planValuesFromKpis(
  kpis: CampaignKpi[]
): Partial<Record<KpiType, number>> {
  const map: Partial<Record<KpiType, number>> = {};
  for (const k of kpis) map[k.kpi_type] = k.planned_value;
  return map;
}

export function calculateMediaMetrics(input: {
  impressions: number;
  reach: number | null;
  clicks: number;
  spend: number;
  conversions: number;
  videoViews: number;
  activeKpis: KpiType[];
}): CalculatedMetrics {
  const {
    impressions,
    reach,
    clicks,
    spend,
    conversions,
    videoViews,
    activeKpis,
  } = input;

  const has = (k: KpiType) => activeKpis.includes(k);

  return {
    cpm:
      has("spend") && has("impressions") && impressions > 0
        ? (spend / impressions) * 1000
        : null,
    ctr:
      has("clicks") && has("impressions") && impressions > 0
        ? (clicks / impressions) * 100
        : null,
    cpc:
      has("spend") && has("clicks") && clicks > 0 ? spend / clicks : null,
    cpa:
      has("spend") && has("conversions") && conversions > 0
        ? spend / conversions
        : null,
    vtr:
      has("video_views") && has("impressions") && impressions > 0
        ? (videoViews / impressions) * 100
        : null,
    frequency:
      has("reach") &&
      has("impressions") &&
      reach !== null &&
      reach > 0 &&
      impressions > 0
        ? impressions / reach
        : null,
  };
}

export function availableCalculatedMetrics(
  activeKpis: KpiType[]
): CalculatedMetricType[] {
  const has = (k: KpiType) => activeKpis.includes(k);
  const keys: CalculatedMetricType[] = [];
  if (has("spend") && has("impressions")) keys.push("cpm");
  if (has("clicks") && has("impressions")) keys.push("ctr");
  if (has("spend") && has("clicks")) keys.push("cpc");
  if (has("spend") && has("conversions")) keys.push("cpa");
  if (has("video_views") && has("impressions")) keys.push("vtr");
  if (has("reach") && has("impressions")) keys.push("frequency");
  return keys;
}

export function calculatePlanMediaMetrics(
  plans: Partial<Record<KpiType, number>>,
  activeKpis: KpiType[]
): CalculatedMetrics {
  return calculateMediaMetrics({
    impressions: plans.impressions ?? 0,
    reach: activeKpis.includes("reach") ? plans.reach ?? null : null,
    clicks: plans.clicks ?? 0,
    spend: plans.spend ?? 0,
    conversions: plans.conversions ?? 0,
    videoViews: plans.video_views ?? 0,
    activeKpis,
  });
}

export function calculateCampaignMediaMetrics(
  dailyMetrics: DailyMetric[],
  activeKpis: KpiType[],
  asOfDate?: string
): CalculatedMetrics {
  const asOf = asOfDate ?? resolveReportAsOf(dailyMetrics);
  const impressions = activeKpis.includes("impressions")
    ? getFactValue(dailyMetrics, "impressions", asOf)
    : 0;
  const reach = activeKpis.includes("reach")
    ? getCumulativeReach(dailyMetrics, asOf)
    : null;
  const clicks = activeKpis.includes("clicks")
    ? getFactValue(dailyMetrics, "clicks", asOf)
    : 0;
  const spend = activeKpis.includes("spend")
    ? getFactValue(dailyMetrics, "spend", asOf)
    : 0;
  const conversions = activeKpis.includes("conversions")
    ? hasDailyKpiValue(dailyMetrics, "conversions", asOf)
      ? getFactValue(dailyMetrics, "conversions", asOf)
      : 0
    : 0;
  const videoViews = activeKpis.includes("video_views")
    ? getFactValue(dailyMetrics, "video_views", asOf)
    : 0;

  return calculateMediaMetrics({
    impressions,
    reach,
    clicks,
    spend,
    conversions,
    videoViews,
    activeKpis,
  });
}

const LOWER_IS_BETTER: CalculatedMetricType[] = ["cpm", "cpc", "cpa"];
const PERCENT_METRICS: CalculatedMetricType[] = ["ctr", "vtr"];
const MONEY_METRICS: CalculatedMetricType[] = ["cpm", "cpc", "cpa"];

export function buildCalculatedComparisons(
  plan: CalculatedMetrics,
  fact: CalculatedMetrics,
  activeKpis: KpiType[]
): CalculatedMetricComparison[] {
  return availableCalculatedMetrics(activeKpis).map((key) => {
    const p = plan[key];
    const f = fact[key];
    const difference =
      p !== null && f !== null && !Number.isNaN(p) && !Number.isNaN(f)
        ? f - p
        : null;
    return {
      key,
      plan: p,
      fact: f,
      difference,
      unit: MONEY_METRICS.includes(key)
        ? "money"
        : PERCENT_METRICS.includes(key)
          ? "pp"
          : "number",
      lowerIsBetter: LOWER_IS_BETTER.includes(key),
    };
  });
}

/** Format Plan/Fact/Δ for calculated metrics (pp for CTR/VTR). */
export function formatCalculatedDifference(
  key: CalculatedMetricType,
  difference: number | null,
  currency: CurrencyCode | string = "RUB"
): string {
  if (difference === null || Number.isNaN(difference)) return "—";
  const sign = difference > 0 ? "+" : "";
  if (key === "ctr" || key === "vtr") {
    return `${sign}${formatNumber(difference, 1)} pp`;
  }
  if (key === "frequency") {
    return `${sign}${formatNumber(difference, 2)}`;
  }
  if (key === "cpm" || key === "cpc" || key === "cpa") {
    return `${sign}${formatMoney(difference, currency, 2)}`;
  }
  return `${sign}${formatNumber(difference, 2)}`;
}

/** Color hint for Δ: green when “better” for that metric type. */
export function calculatedDiffTone(
  key: CalculatedMetricType,
  difference: number | null
): "good" | "bad" | "neutral" {
  if (difference === null || difference === 0) return "neutral";
  if (key === "frequency") return "neutral";
  const lowerBetter = LOWER_IS_BETTER.includes(key);
  const better = lowerBetter ? difference < 0 : difference > 0;
  return better ? "good" : "bad";
}

export function calculateKpiMetrics(
  campaign: Pick<Campaign, "start_date" | "end_date">,
  plannedValue: number,
  kpiType: KpiType,
  dailyMetrics: DailyMetric[],
  today: Date = new Date()
): KpiMetrics {
  const reportDate = resolveReportDate(dailyMetrics, today);
  const asOf = toDateString(reportDate);
  const total = totalCampaignDays(campaign.start_date, campaign.end_date);
  const daysFact = getDaysFact(campaign.start_date, campaign.end_date, reportDate);
  const daysRemaining = getDaysRemaining(
    campaign.start_date,
    campaign.end_date,
    reportDate
  );
  const missingDays = getMissingDates(
    campaign.start_date,
    campaign.end_date,
    dailyMetrics,
    reportDate
  ).length;

  const totalPlan = plannedValue;
  const hasFact = hasDailyKpiValue(dailyMetrics, kpiType, asOf);
  const rawFact = getFactValue(dailyMetrics, kpiType, asOf);
  const totalFact = hasFact ? rawFact : null;
  const remaining =
    totalFact === null ? totalPlan : Math.max(0, totalPlan - totalFact);
  const progress =
    totalFact !== null && totalPlan > 0 ? (totalFact / totalPlan) * 100 : 0;
  const dailyPlan = total > 0 ? totalPlan / total : 0;
  const expectedFact = total > 0 ? totalPlan * (daysFact / total) : 0;
  const pacing =
    totalFact === null
      ? null
      : expectedFact > 0
        ? (totalFact / expectedFact) * 100
        : daysFact === 0
          ? null
          : 0;
  const actualDailyAverage =
    totalFact !== null && daysFact > 0 && !isCumulativeKpi(kpiType)
      ? totalFact / daysFact
      : totalFact ?? 0;

  return {
    kpiType,
    totalPlan,
    totalFact,
    remaining,
    progress,
    expectedFact,
    pacing,
    dailyPlan,
    actualDailyAverage,
    daysFact,
    daysRemaining,
    totalCampaignDays: total,
    missingDays,
    isCumulative: isCumulativeKpi(kpiType),
    hasFact,
  };
}

export function resolvePrimaryKpi(
  campaign: Pick<Campaign, "primary_kpi">,
  kpis: CampaignKpi[]
): KpiType {
  if (kpis.some((k) => k.kpi_type === campaign.primary_kpi)) {
    return campaign.primary_kpi;
  }
  if (kpis.length > 0) return kpis[0].kpi_type;
  return "impressions";
}

export function resolveCampaignStatus(
  campaign: Pick<Campaign, "end_date" | "primary_kpi">,
  metrics: KpiMetrics[],
  primaryKpi: KpiType,
  today: Date = new Date()
): CampaignStatus {
  if (isCampaignCompleted(campaign.end_date, today)) return "completed";
  const primary = metrics.find((m) => m.kpiType === primaryKpi);
  if (!primary || primary.pacing === null) return "attention";
  return statusFromPacing(primary.pacing, false);
}

export function buildCampaignSummary(
  campaign: CampaignWithRelations,
  today: Date = new Date()
): CampaignSummary {
  const reportDate = resolveReportDate(campaign.daily_metrics, today);
  const asOf = toDateString(reportDate);
  const activeTypes = campaign.kpis.map((k) => k.kpi_type);
  const allMetrics = campaign.kpis.map((kpi) =>
    calculateKpiMetrics(
      campaign,
      kpi.planned_value,
      kpi.kpi_type,
      campaign.daily_metrics,
      today
    )
  );
  const primaryKpi = resolvePrimaryKpi(campaign, campaign.kpis);
  const metrics =
    allMetrics.find((m) => m.kpiType === primaryKpi) ?? allMetrics[0] ?? null;
  const status = resolveCampaignStatus(campaign, allMetrics, primaryKpi, reportDate);
  const total = totalCampaignDays(campaign.start_date, campaign.end_date);
  const daysFact = getDaysFact(campaign.start_date, campaign.end_date, reportDate);
  const missingDays = getMissingDates(
    campaign.start_date,
    campaign.end_date,
    campaign.daily_metrics,
    reportDate
  ).length;

  const factByKpi: Partial<Record<KpiType, number>> = {};
  for (const type of KPI_TYPES) {
    if (activeTypes.includes(type) && hasDailyKpiValue(campaign.daily_metrics, type, asOf)) {
      factByKpi[type] = getFactValue(campaign.daily_metrics, type, asOf);
    }
  }

  const plans = planValuesFromKpis(campaign.kpis);
  const calculatedPlan = calculatePlanMediaMetrics(plans, activeTypes);
  const calculated = calculateCampaignMediaMetrics(
    campaign.daily_metrics,
    activeTypes,
    asOf
  );

  return {
    campaign,
    primaryKpi,
    metrics,
    allMetrics,
    calculated,
    calculatedPlan,
    calculatedComparisons: buildCalculatedComparisons(
      calculatedPlan,
      calculated,
      activeTypes
    ),
    status,
    daysLabel: `${daysFact}/${total}`,
    missingDays,
    factByKpi,
  };
}

export function buildDailyRows(
  campaign: Pick<Campaign, "start_date" | "end_date">,
  plannedValue: number,
  kpiType: KpiType,
  dailyMetrics: DailyMetric[],
  today: Date = new Date()
): DailyRow[] {
  const reportDate = resolveReportDate(dailyMetrics, today);
  const total = totalCampaignDays(campaign.start_date, campaign.end_date);
  const dailyPlanBase = total > 0 ? plannedValue / total : 0;
  const start = parseDate(campaign.start_date);
  const end = parseDate(campaign.end_date);
  const byDate = new Map(
    dailyMetrics.map((m) => [m.date.slice(0, 10), m] as const)
  );
  const now = startOfDay(reportDate);

  const rows: DailyRow[] = [];
  let cumulativeFact = 0;
  let cursor = start;
  let dayIndex = 0;

  while (!isAfter(cursor, end)) {
    dayIndex += 1;
    const date = toDateString(cursor);
    const metric = byDate.get(date);
    const raw = metric ? getKpiValueFromDaily(metric, kpiType) : null;
    const hasData = Boolean(metric) && raw !== null;
    const pastOrToday = !isAfter(cursor, now);

    if (isCumulativeKpi(kpiType)) {
      // Reach: linear cumulative plan, fact = cumulative reach value
      const cumulativePlan = plannedValue * (dayIndex / total);
      if (raw !== null) cumulativeFact = raw;
      const actual = hasData ? raw! : cumulativeFact;
      const showFact = pastOrToday && (hasData || cumulativeFact > 0);
      const difference = showFact && (hasData || dayIndex > 0) ? actual - cumulativePlan : 0;
      const pacing =
        pastOrToday && cumulativePlan > 0 && (hasData || cumulativeFact > 0)
          ? (cumulativeFact / cumulativePlan) * 100
          : null;

      rows.push({
        date,
        dailyPlan: cumulativePlan,
        actual: showFact ? cumulativeFact : 0,
        difference: hasData || (pastOrToday && cumulativeFact > 0) ? difference : 0,
        cumulativePlan,
        cumulativeFact,
        pacing: hasData || (pastOrToday && cumulativeFact > 0) ? pacing : null,
        hasData: Boolean(metric),
      });
    } else {
      const dailyPlan = dailyPlanBase;
      const actual = hasData ? raw! : 0;
      if (hasData) cumulativeFact += actual;
      const cumulativePlan = dailyPlan * dayIndex;
      const difference = hasData ? actual - dailyPlan : 0;
      // Daily pacing = Actual / Daily Plan (not cumulative)
      const pacing =
        hasData && dailyPlan > 0 ? (actual / dailyPlan) * 100 : null;

      rows.push({
        date,
        dailyPlan,
        actual: hasData ? actual : 0,
        difference,
        cumulativePlan,
        cumulativeFact,
        pacing,
        hasData: Boolean(metric),
      });
    }

    cursor = addDays(cursor, 1);
  }

  return rows;
}

export function buildChartPoints(
  campaign: Pick<Campaign, "start_date" | "end_date">,
  plannedValue: number,
  kpiType: KpiType,
  dailyMetrics: DailyMetric[],
  today: Date = new Date()
): ChartPoint[] {
  const reportDate = resolveReportDate(dailyMetrics, today);
  const rows = buildDailyRows(
    campaign,
    plannedValue,
    kpiType,
    dailyMetrics,
    today
  );
  const now = startOfDay(reportDate);
  const cumulative = isCumulativeKpi(kpiType);

  return rows.map((row) => {
    const date = parseDate(row.date);
    const pastOrToday = !isAfter(date, now);
    return {
      date: row.date,
      label: format(date, "d MMM", { locale: ru }),
      expectedCumulative: row.cumulativePlan,
      actualCumulative: pastOrToday ? row.cumulativeFact : null,
      dailyPlan: cumulative ? row.dailyPlan : row.dailyPlan,
      dailyFact: pastOrToday && row.hasData ? row.actual : null,
    };
  });
}

/** Build rows for calculated metric tabs (CPM, CTR, …, Frequency) with Plan vs Fact */
export function buildCalculatedDailyRows(
  campaign: Pick<Campaign, "start_date" | "end_date">,
  dailyMetrics: DailyMetric[],
  activeKpis: KpiType[],
  metricKey: CalculatedMetricType,
  plans: Partial<Record<KpiType, number>>,
  today: Date = new Date()
): DailyRow[] {
  const planMetrics = calculatePlanMediaMetrics(plans, activeKpis);
  const planValue = planMetrics[metricKey];
  const calcRows = buildDailyCalculatedRows(
    campaign,
    dailyMetrics,
    activeKpis,
    today
  );

  return calcRows
    .filter((r) => r.hasData)
    .map((r) => {
      const factValue = r.calculated[metricKey];
      const hasFact = factValue !== null;
      const difference =
        hasFact && planValue !== null ? factValue! - planValue : 0;
      return {
        date: r.date,
        dailyPlan: planValue ?? 0,
        actual: factValue ?? 0,
        difference,
        cumulativePlan: planValue ?? 0,
        cumulativeFact: factValue ?? 0,
        pacing: null,
        hasData: hasFact,
      };
    });
}

/**
 * Per-day inputs + calculated metrics.
 * Daily Frequency = Impressions / Reach Increment (not campaign-level Frequency).
 */
export function buildDailyCalculatedRows(
  campaign: Pick<Campaign, "start_date" | "end_date">,
  dailyMetrics: DailyMetric[],
  activeKpis: KpiType[],
  today: Date = new Date()
): DailyCalculatedRow[] {
  const start = parseDate(campaign.start_date);
  const end = parseDate(campaign.end_date);
  const byDate = new Map(
    dailyMetrics.map((m) => [m.date.slice(0, 10), m] as const)
  );
  const hasReach = activeKpis.includes("reach");
  const reportDate = resolveReportDate(dailyMetrics, today);
  const asOf = toDateString(reportDate);
  const now = startOfDay(reportDate);

  const rows: DailyCalculatedRow[] = [];
  let cumImp = 0;
  let prevCumReach: number | null = null;
  let cursor = start;

  while (!isAfter(cursor, end) && !isAfter(cursor, now)) {
    const date = toDateString(cursor);
    if (date > asOf) break;

    const m = byDate.get(date);
    const hasData = Boolean(m);

    const impressions = m?.impressions ?? null;
    const reach = m?.reach ?? null;
    const clicks = m?.clicks ?? null;
    const spend = m?.spend ?? null;
    const conversions = m?.conversions ?? null;
    const video_views = m?.video_views ?? null;

    let reachIncrement: number | null = null;
    if (hasData && hasReach && reach !== null) {
      reachIncrement =
        prevCumReach === null ? reach : Math.max(0, reach - prevCumReach);
      prevCumReach = reach;
    }

    if (hasData) {
      cumImp += impressions ?? 0;
    }

    // Day-level efficiency from that day's inputs
    const dayCalc = calculateMediaMetrics({
      impressions: impressions ?? 0,
      reach: hasReach ? reach : null,
      clicks: clicks ?? 0,
      spend: spend ?? 0,
      conversions: conversions ?? 0,
      videoViews: video_views ?? 0,
      activeKpis,
    });

    // Daily Frequency = daily Imp / reach increment
    dayCalc.frequency =
      hasReach &&
      activeKpis.includes("impressions") &&
      reachIncrement !== null &&
      reachIncrement > 0 &&
      (impressions ?? 0) > 0
        ? (impressions as number) / reachIncrement
        : null;

    rows.push({
      date,
      hasData,
      impressions,
      reach,
      reachIncrement,
      clicks,
      spend,
      conversions,
      video_views,
      cumulativeImpressions: cumImp,
      cumulativeReach: prevCumReach,
      calculated: dayCalc,
    });

    cursor = addDays(cursor, 1);
  }

  return rows;
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${formatNumber(value, decimals)}%`;
}

export function formatMoney(
  value: number,
  currency: CurrencyCode | string = "RUB",
  decimals?: number
): string {
  const { symbol } = getCurrency(currency);
  const d = decimals ?? (Math.abs(value) >= 100 || value % 1 === 0 ? 0 : 2);
  return `${formatNumber(value, d)} ${symbol}`;
}

export function formatKpiValue(
  kpiType: KpiType,
  value: number,
  currency: CurrencyCode | string = "RUB"
): string {
  if (kpiType === "spend") return formatMoney(value, currency);
  return formatNumber(value, 0);
}

export function formatCalculated(
  key: keyof CalculatedMetrics,
  value: number | null,
  currency: CurrencyCode | string = "RUB"
): string {
  if (value === null || Number.isNaN(value)) return "—";
  if (key === "ctr" || key === "vtr") return formatPercent(value, 1);
  if (key === "frequency") return formatNumber(value, 2);
  if (key === "cpm" || key === "cpc" || key === "cpa") {
    return formatMoney(value, currency, 2);
  }
  return formatNumber(value, 2);
}
