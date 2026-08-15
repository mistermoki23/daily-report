import "server-only";

import { addDays } from "date-fns";
import { isAdminRole } from "@/lib/auth/roles";
import {
  calculateMediaMetrics,
  parseDate,
  toDateString,
  totalCampaignDays,
} from "@/lib/calculations";
import {
  convertToUsd,
  getUsdRates,
  type UsdRateTable,
} from "@/lib/currency/exchange-rates";
import { prisma } from "@/lib/db/prisma-client";
import { mapBrand, mapClient } from "@/lib/db/mappers";
import {
  ALL_BRANDS_LABEL,
  brandIdPrismaWhere,
  normalizeBrandFilter,
  UNASSIGNED_BRAND_LABEL,
} from "@/lib/brands/filter";
import {
  CURRENCIES,
  KPI_TYPES,
  type Brand,
  type CalculatedMetrics,
  type Client,
  type CurrencyCode,
  type KpiType,
} from "@/lib/types";

export type BrandReportMode = "daily" | "weekly";

/**
 * Brand Reports store spend only in USD after FX conversion.
 * Key remains for UI/export compatibility; only USD is populated.
 */
export type SpendByCurrency = Partial<Record<CurrencyCode, number>>;

export type BrandMetricTotals = {
  impressions: number;
  reach: number;
  clicks: number;
  /** Spend in USD (after FX). */
  spend: number;
  spendByCurrency: SpendByCurrency;
  conversions: number;
  video_views: number;
};

export type BrandDeviation = {
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  conversions: number | null;
  video_views: number | null;
  /** Percent deviation per currency. */
  spendByCurrency: Partial<Record<CurrencyCode, number | null>>;
};

export type BrandReportRowKind = "day" | "week_total" | "platform";

export type BrandReportRow = {
  kind: BrandReportRowKind;
  label: string;
  start: string;
  end: string;
  weekIndex?: number;
  platformId?: string | null;
  platformName?: string | null;
  plan: BrandMetricTotals;
  fact: BrandMetricTotals;
  deviation: BrandDeviation;
  calculatedPlan: CalculatedMetrics;
  calculatedFact: CalculatedMetrics;
  /** @deprecated alias of fact for older consumers */
  metrics: BrandMetricTotals;
  /** @deprecated alias of calculatedFact */
  calculated: CalculatedMetrics;
};

export type BrandReportWeekBlock = {
  weekIndex: number;
  label: string;
  start: string;
  end: string;
  total: BrandReportRow;
  platforms: BrandReportRow[];
};

export type BrandReport = {
  client: Client;
  brand: Brand;
  brandFilter: "all" | "none" | "brand";
  period: { startDate: string; endDate: string };
  mode: BrandReportMode;
  currencies: CurrencyCode[];
  campaigns: {
    id: string;
    name: string;
    brand_id: string | null;
    brand_name: string;
    platform_id: string;
    platform_name: string;
    currency: CurrencyCode;
  }[];
  plan: BrandMetricTotals;
  fact: BrandMetricTotals;
  deviation: BrandDeviation;
  rows: BrandReportRow[];
  weeks: BrandReportWeekBlock[];
  activeKpis: KpiType[];
};

type DayMetrics = BrandMetricTotals;

type CampaignPlanSlice = {
  impressions: number;
  reach: number;
  clicks: number;
  /** Plan spend already converted to USD. */
  spend: number;
  conversions: number;
  video_views: number;
  currency: CurrencyCode;
  platformId: string;
  platformName: string;
  campaignStart: string;
  campaignEnd: string;
  campaignDays: number;
};

const HIGH_DENOMINATION_CURRENCIES: CurrencyCode[] = ["UZS", "KZT", "RUB"];

/**
 * When campaign.currency is USD but fact amounts are clearly in a local
 * high-denomination currency (classic Megogo case: plan in USD, supplier fact in UZS),
 * infer the real fact currency for FX only — DB values stay untouched.
 */
function resolveFactSourceCurrency(
  declared: CurrencyCode,
  planAmountInDeclared: number,
  factAmount: number,
  rates: UsdRateTable
): CurrencyCode {
  if (declared !== "USD" || !(planAmountInDeclared > 0) || !(factAmount > 0)) {
    return declared;
  }
  if (factAmount / planAmountInDeclared <= 20) return "USD";

  let best: CurrencyCode | null = null;
  let bestScore = Infinity;
  for (const code of HIGH_DENOMINATION_CURRENCIES) {
    const rate = rates[code];
    if (rate == null || rate < 2) continue;
    const usd = factAmount / rate;
    const ratio = usd / planAmountInDeclared;
    if (ratio < 0.01 || ratio > 5) continue;
    const score = Math.abs(Math.log(ratio));
    if (score < bestScore) {
      bestScore = score;
      best = code;
    }
  }
  return best ?? declared;
}

function spendToUsd(
  amount: number,
  sourceCurrency: CurrencyCode,
  rates: UsdRateTable,
  platform: string
): number {
  if (!amount) return 0;
  return convertToUsd(amount, sourceCurrency, rates, { platform });
}

const CURRENCY_ORDER = CURRENCIES.map((c) => c.code);

function emptyMetrics(): DayMetrics {
  return {
    impressions: 0,
    reach: 0,
    clicks: 0,
    spend: 0,
    spendByCurrency: {},
    conversions: 0,
    video_views: 0,
  };
}

function addSpend(target: SpendByCurrency, currency: CurrencyCode, amount: number) {
  if (!amount) return;
  target[currency] = (target[currency] ?? 0) + amount;
}

function mergeSpend(a: SpendByCurrency, b: SpendByCurrency): SpendByCurrency {
  const out: SpendByCurrency = { ...a };
  for (const [code, value] of Object.entries(b) as [CurrencyCode, number][]) {
    if (!value) continue;
    out[code] = (out[code] ?? 0) + value;
  }
  return out;
}

function spendEntries(spend: SpendByCurrency): { currency: CurrencyCode; amount: number }[] {
  return CURRENCY_ORDER.filter((c) => (spend[c] ?? 0) !== 0).map((currency) => ({
    currency,
    amount: spend[currency] ?? 0,
  }));
}

function primarySpend(spend: SpendByCurrency): number {
  const entries = spendEntries(spend);
  return entries.length === 1 ? entries[0].amount : 0;
}

function finalizeMetrics(m: DayMetrics): DayMetrics {
  return {
    ...m,
    spend: primarySpend(m.spendByCurrency),
  };
}

function addMetrics(a: DayMetrics, b: DayMetrics): DayMetrics {
  return finalizeMetrics({
    impressions: a.impressions + b.impressions,
    reach: a.reach + b.reach,
    clicks: a.clicks + b.clicks,
    spend: 0,
    spendByCurrency: mergeSpend(a.spendByCurrency, b.spendByCurrency),
    conversions: a.conversions + b.conversions,
    video_views: a.video_views + b.video_views,
  });
}

function hasAnyMetric(m: DayMetrics): boolean {
  return (
    m.impressions !== 0 ||
    m.reach !== 0 ||
    m.clicks !== 0 ||
    m.conversions !== 0 ||
    m.video_views !== 0 ||
    spendEntries(m.spendByCurrency).length > 0
  );
}

function deviationPct(fact: number, plan: number): number | null {
  if (plan === 0) return null;
  return ((fact - plan) / plan) * 100;
}

function buildDeviation(fact: DayMetrics, plan: DayMetrics): BrandDeviation {
  const spendByCurrency: Partial<Record<CurrencyCode, number | null>> = {};
  const codes = new Set([
    ...Object.keys(fact.spendByCurrency),
    ...Object.keys(plan.spendByCurrency),
  ] as CurrencyCode[]);
  for (const code of codes) {
    const p = plan.spendByCurrency[code] ?? 0;
    const f = fact.spendByCurrency[code] ?? 0;
    if (p === 0 && f === 0) continue;
    spendByCurrency[code] = deviationPct(f, p);
  }
  return {
    impressions: deviationPct(fact.impressions, plan.impressions),
    reach: deviationPct(fact.reach, plan.reach),
    clicks: deviationPct(fact.clicks, plan.clicks),
    conversions: deviationPct(fact.conversions, plan.conversions),
    video_views: deviationPct(fact.video_views, plan.video_views),
    spendByCurrency,
  };
}

function decimalOrZero(value: { toString(): string } | null | undefined): number {
  if (value == null) return 0;
  return Number(value.toString());
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
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

function weekChunks(
  startDate: string,
  endDate: string
): { start: string; end: string }[] {
  const chunks: { start: string; end: string }[] = [];
  let cursor = startDate.slice(0, 10);
  const end = endDate.slice(0, 10);
  while (cursor <= end) {
    const chunkStart = cursor;
    const chunkEndCandidate = toDateString(addDays(parseDate(chunkStart), 6));
    const chunkEnd = chunkEndCandidate < end ? chunkEndCandidate : end;
    chunks.push({ start: chunkStart, end: chunkEnd });
    cursor = toDateString(addDays(parseDate(chunkEnd), 1));
  }
  return chunks;
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

/** Days of campaign that fall inside [rangeStart, rangeEnd]. */
function overlapDays(
  campaignStart: string,
  campaignEnd: string,
  rangeStart: string,
  rangeEnd: string
): number {
  const start = maxDate(campaignStart, rangeStart);
  const end = minDate(campaignEnd, rangeEnd);
  if (end < start) return 0;
  return totalCampaignDays(start, end);
}

/**
 * Prorate full campaign plan onto a date slice.
 * dailyPlan = totalPlan / campaignDays; slicePlan = dailyPlan * daysInSlice.
 */
function prorateCampaignPlan(
  slice: CampaignPlanSlice,
  rangeStart: string,
  rangeEnd: string
): DayMetrics {
  const days = overlapDays(
    slice.campaignStart,
    slice.campaignEnd,
    rangeStart,
    rangeEnd
  );
  if (days <= 0 || slice.campaignDays <= 0) return emptyMetrics();
  const ratio = days / slice.campaignDays;
  const out = emptyMetrics();
  out.impressions = slice.impressions * ratio;
  out.reach = slice.reach * ratio;
  out.clicks = slice.clicks * ratio;
  out.conversions = slice.conversions * ratio;
  out.video_views = slice.video_views * ratio;
  if (slice.spend) {
    // slice.spend is already USD
    addSpend(out.spendByCurrency, "USD", slice.spend * ratio);
  }
  return finalizeMetrics(out);
}

function calcFromTotals(totals: DayMetrics, activeKpis: KpiType[]): CalculatedMetrics {
  // Brand Reports: spend is always USD after FX — CPM/CPC use USD spend.
  return calculateMediaMetrics({
    impressions: totals.impressions,
    reach: activeKpis.includes("reach") ? totals.reach : null,
    clicks: totals.clicks,
    spend: totals.spend,
    conversions: totals.conversions,
    videoViews: totals.video_views,
    activeKpis,
  });
}

function displayPeriod(start: string, end: string): string {
  const a = start.slice(0, 10).split("-").reverse().join(".");
  const b = end.slice(0, 10).split("-").reverse().join(".");
  return `${a} — ${b}`;
}

function syntheticBrand(clientId: string, name: string): Brand {
  return {
    id: "",
    name,
    client_id: clientId,
    created_at: new Date(0).toISOString(),
  };
}

function makeRow(input: {
  kind: BrandReportRowKind;
  label: string;
  start: string;
  end: string;
  weekIndex?: number;
  platformId?: string | null;
  platformName?: string | null;
  plan: DayMetrics;
  fact: DayMetrics;
  activeKpis: KpiType[];
}): BrandReportRow {
  const plan = finalizeMetrics(input.plan);
  const fact = finalizeMetrics(input.fact);
  const calculatedFact = calcFromTotals(fact, input.activeKpis);
  return {
    kind: input.kind,
    label: input.label,
    start: input.start,
    end: input.end,
    weekIndex: input.weekIndex,
    platformId: input.platformId,
    platformName: input.platformName,
    plan,
    fact,
    deviation: buildDeviation(fact, plan),
    calculatedPlan: calcFromTotals(plan, input.activeKpis),
    calculatedFact,
    metrics: fact,
    calculated: calculatedFact,
  };
}

/**
 * Per-campaign daily increments for additive KPIs + reach increments.
 * Spend is converted to USD before being stored.
 */
function campaignDayFacts(
  dailyData: {
    date: Date;
    impressions: { toString(): string } | null;
    reachCumulative: { toString(): string } | null;
    clicks: { toString(): string } | null;
    spend: { toString(): string } | null;
    conversions: { toString(): string } | null;
    videoViews: { toString(): string } | null;
  }[],
  startDate: string,
  endDate: string,
  sourceCurrency: CurrencyCode,
  rates: UsdRateTable,
  platformName: string
): Map<string, DayMetrics> {
  const byDate = new Map<string, DayMetrics>();
  const sorted = [...dailyData].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  let prevReach: number | null = null;

  for (const row of sorted) {
    const date = dateOnly(row.date);
    const reachCum =
      row.reachCumulative != null ? Number(row.reachCumulative.toString()) : null;
    let reachInc = 0;
    if (reachCum != null) {
      reachInc = prevReach == null ? reachCum : Math.max(0, reachCum - prevReach);
      prevReach = reachCum;
    }

    if (date < startDate || date > endDate) continue;

    const rawSpend = decimalOrZero(row.spend);
    const spendUsd = spendToUsd(rawSpend, sourceCurrency, rates, platformName);
    const spendByCurrency: SpendByCurrency = {};
    addSpend(spendByCurrency, "USD", spendUsd);

    byDate.set(
      date,
      finalizeMetrics({
        impressions: decimalOrZero(row.impressions),
        reach: reachInc,
        clicks: decimalOrZero(row.clicks),
        spend: 0,
        spendByCurrency,
        conversions: decimalOrZero(row.conversions),
        video_views: decimalOrZero(row.videoViews),
      })
    );
  }

  return byDate;
}

export function formatSpendByCurrency(
  spend: SpendByCurrency,
  formatMoney: (value: number, currency: CurrencyCode) => string
): string {
  const amount = spend.USD ?? primarySpend(spend);
  return formatMoney(amount || 0, "USD");
}

export function listSpendCurrencies(spend: SpendByCurrency): CurrencyCode[] {
  return spendEntries(spend).map((e) => e.currency);
}

export function formatDeviation(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ru-RU", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}%`;
}

export async function getBrandReport(input: {
  userId: string;
  role: string;
  clientId: string;
  brandId?: string | null;
  startDate: string;
  endDate: string;
  mode: BrandReportMode;
}): Promise<BrandReport> {
  const startDate = input.startDate.slice(0, 10);
  const endDate = input.endDate.slice(0, 10);
  if (
    !startDate ||
    !endDate ||
    Number.isNaN(Date.parse(startDate)) ||
    Number.isNaN(Date.parse(endDate))
  ) {
    throw new Error("Даты периода некорректны");
  }
  if (endDate < startDate) {
    throw new Error("Дата окончания не может быть раньше даты начала");
  }
  if (input.mode !== "daily" && input.mode !== "weekly") {
    throw new Error("mode должен быть daily или weekly");
  }

  const clientRow = await prisma.client.findUnique({
    where: { id: input.clientId },
  });
  if (!clientRow) throw new Error("Клиент не найден");
  const client = mapClient(clientRow);

  const brandFilter = normalizeBrandFilter(input.brandId);
  let brand: Brand;

  if (brandFilter.kind === "brand") {
    const brandRow = await prisma.brand.findUnique({
      where: { id: brandFilter.brandId },
    });
    if (!brandRow) throw new Error("Бренд не найден");
    if (brandRow.clientId !== input.clientId) {
      throw new Error("Бренд не принадлежит выбранному клиенту");
    }
    brand = mapBrand(brandRow);
  } else if (brandFilter.kind === "none") {
    brand = syntheticBrand(input.clientId, UNASSIGNED_BRAND_LABEL);
  } else {
    brand = syntheticBrand(input.clientId, ALL_BRANDS_LABEL);
  }

  const campaigns = await prisma.campaign.findMany({
    where: {
      clientId: input.clientId,
      deletedAt: null,
      ...brandIdPrismaWhere(input.brandId),
      ...(isAdminRole(input.role)
        ? {}
        : { accesses: { some: { userId: input.userId } } }),
    },
    include: {
      brand: true,
      platform: true,
      plan: true,
      dailyData: { orderBy: { date: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  const rates = await getUsdRates();

  const planSlices: CampaignPlanSlice[] = [];
  const activeKpiSet = new Set<KpiType>();
  const platformMeta = new Map<string, string>();

  for (const c of campaigns) {
    const currency = c.currency as CurrencyCode;
    platformMeta.set(c.platformId, c.platform.name);
    const campaignStart = dateOnly(c.startDate);
    const campaignEnd = dateOnly(c.endDate);
    const campaignDays = totalCampaignDays(campaignStart, campaignEnd);
    const rawPlanSpend = decimalOrZero(c.plan?.spend);
    const planSpendUsd = spendToUsd(
      rawPlanSpend,
      currency,
      rates,
      c.platform.name
    );
    const slice: CampaignPlanSlice = {
      impressions: decimalOrZero(c.plan?.impressions),
      reach: decimalOrZero(c.plan?.reach),
      clicks: decimalOrZero(c.plan?.clicks),
      spend: planSpendUsd,
      conversions: decimalOrZero(c.plan?.conversions),
      video_views: decimalOrZero(c.plan?.videoViews),
      currency,
      platformId: c.platformId,
      platformName: c.platform.name,
      campaignStart,
      campaignEnd,
      campaignDays,
    };
    planSlices.push(slice);
    if (slice.impressions > 0) activeKpiSet.add("impressions");
    if (slice.reach > 0) activeKpiSet.add("reach");
    if (slice.clicks > 0) activeKpiSet.add("clicks");
    if (rawPlanSpend > 0) activeKpiSet.add("spend");
    if (slice.conversions > 0) activeKpiSet.add("conversions");
    if (slice.video_views > 0) activeKpiSet.add("video_views");
  }

  const activeKpis = KPI_TYPES.filter((k) => activeKpiSet.has(k));

  /** Full-period plan prorated to selected date range (same days as fact). */
  let periodPlan = emptyMetrics();
  for (const slice of planSlices) {
    periodPlan = addMetrics(
      periodPlan,
      prorateCampaignPlan(slice, startDate, endDate)
    );
  }

  const dailyFact = new Map<string, DayMetrics>();
  const dailyFactByPlatform = new Map<string, Map<string, DayMetrics>>();

  for (const date of datesInRange(startDate, endDate)) {
    dailyFact.set(date, emptyMetrics());
    dailyFactByPlatform.set(date, new Map());
  }

  for (const c of campaigns) {
    const currency = c.currency as CurrencyCode;
    const rawPlanSpend = decimalOrZero(c.plan?.spend);
    const factTotalRaw = c.dailyData.reduce(
      (sum, row) => sum + decimalOrZero(row.spend),
      0
    );
    const factSourceCurrency = resolveFactSourceCurrency(
      currency,
      rawPlanSpend,
      factTotalRaw,
      rates
    );
    const dayFacts = campaignDayFacts(
      c.dailyData,
      startDate,
      endDate,
      factSourceCurrency,
      rates,
      c.platform.name
    );
    for (const [date, metrics] of dayFacts) {
      if (!hasAnyMetric(metrics)) continue;
      dailyFact.set(date, addMetrics(dailyFact.get(date) ?? emptyMetrics(), metrics));
      const platMap = dailyFactByPlatform.get(date) ?? new Map();
      platMap.set(
        c.platformId,
        addMetrics(platMap.get(c.platformId) ?? emptyMetrics(), metrics)
      );
      dailyFactByPlatform.set(date, platMap);
    }
  }

  let periodFact = emptyMetrics();
  for (const metrics of dailyFact.values()) {
    periodFact = addMetrics(periodFact, metrics);
  }

  let rows: BrandReportRow[] = [];
  let weeks: BrandReportWeekBlock[] = [];

  if (input.mode === "daily") {
    rows = datesInRange(startDate, endDate).map((date) => {
      let dayPlan = emptyMetrics();
      for (const slice of planSlices) {
        dayPlan = addMetrics(dayPlan, prorateCampaignPlan(slice, date, date));
      }
      const fact = dailyFact.get(date) ?? emptyMetrics();
      return makeRow({
        kind: "day",
        label: date,
        start: date,
        end: date,
        plan: dayPlan,
        fact,
        activeKpis,
      });
    });
  } else {
    weeks = weekChunks(startDate, endDate).map((chunk, i) => {
      const weekIndex = i + 1;

      let weekPlan = emptyMetrics();
      const platformPlan = new Map<string, DayMetrics>();
      for (const slice of planSlices) {
        const part = prorateCampaignPlan(slice, chunk.start, chunk.end);
        weekPlan = addMetrics(weekPlan, part);
        if (!hasAnyMetric(part)) continue;
        platformPlan.set(
          slice.platformId,
          addMetrics(platformPlan.get(slice.platformId) ?? emptyMetrics(), part)
        );
      }

      let weekFact = emptyMetrics();
      const platformFact = new Map<string, DayMetrics>();
      for (const date of datesInRange(chunk.start, chunk.end)) {
        weekFact = addMetrics(weekFact, dailyFact.get(date) ?? emptyMetrics());
        const platMap = dailyFactByPlatform.get(date);
        if (!platMap) continue;
        for (const [platformId, metrics] of platMap) {
          platformFact.set(
            platformId,
            addMetrics(platformFact.get(platformId) ?? emptyMetrics(), metrics)
          );
        }
      }

      const label = `Week ${weekIndex} (${displayPeriod(chunk.start, chunk.end)})`;
      const total = makeRow({
        kind: "week_total",
        label: "Total",
        weekIndex,
        start: chunk.start,
        end: chunk.end,
        plan: weekPlan,
        fact: weekFact,
        activeKpis,
      });

      const platformIds = new Set([
        ...platformPlan.keys(),
        ...platformFact.keys(),
      ]);
      const platforms: BrandReportRow[] = [...platformIds]
        .map((platformId) => {
          const plan = platformPlan.get(platformId) ?? emptyMetrics();
          const fact = platformFact.get(platformId) ?? emptyMetrics();
          return makeRow({
            kind: "platform",
            label: platformMeta.get(platformId) ?? platformId,
            weekIndex,
            start: chunk.start,
            end: chunk.end,
            platformId,
            platformName: platformMeta.get(platformId) ?? platformId,
            plan,
            fact,
            activeKpis,
          });
        })
        .filter((row) => hasAnyMetric(row.plan) || hasAnyMetric(row.fact))
        .sort((a, b) => a.label.localeCompare(b.label, "ru"));

      return {
        weekIndex,
        label,
        start: chunk.start,
        end: chunk.end,
        total,
        platforms,
      };
    });

    rows = weeks.flatMap((w) => [w.total, ...w.platforms]);
  }

  const currencies: CurrencyCode[] = ["USD"];

  return {
    client,
    brand,
    brandFilter: brandFilter.kind,
    period: { startDate, endDate },
    mode: input.mode,
    currencies,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      brand_id: c.brandId,
      brand_name: c.brand?.name ?? UNASSIGNED_BRAND_LABEL,
      platform_id: c.platformId,
      platform_name: c.platform.name,
      currency: c.currency as CurrencyCode,
    })),
    plan: finalizeMetrics(periodPlan),
    fact: finalizeMetrics(periodFact),
    deviation: buildDeviation(periodFact, periodPlan),
    rows,
    weeks,
    activeKpis,
  };
}
