import type { CampaignStatus } from "@/lib/config/pacing";

/** Manual input KPIs (plan + daily fact) */
export type KpiType =
  | "impressions"
  | "reach"
  | "clicks"
  | "spend"
  | "conversions"
  | "video_views";

/** Derived metrics — never stored, always calculated */
export type CalculatedMetricType =
  | "cpm"
  | "ctr"
  | "cpc"
  | "cpa"
  | "vtr"
  | "frequency";

export const KPI_TYPES: KpiType[] = [
  "impressions",
  "reach",
  "clicks",
  "spend",
  "video_views",
  "conversions",
];

/** KPIs that sum across days */
export const SUMMABLE_KPIS: KpiType[] = [
  "impressions",
  "clicks",
  "spend",
  "conversions",
  "video_views",
];

/** KPIs that use latest cumulative value (not SUM) */
export const CUMULATIVE_KPIS: KpiType[] = ["reach"];

export const KPI_LABELS: Record<KpiType, string> = {
  impressions: "Impressions",
  reach: "Reach",
  clicks: "Clicks",
  spend: "Spend",
  conversions: "Conversions",
  video_views: "Views — Досмотры",
};

export const CALCULATED_LABELS: Record<CalculatedMetricType, string> = {
  cpm: "CPM",
  ctr: "CTR",
  cpc: "CPC",
  cpa: "CPA",
  vtr: "VTR",
  frequency: "Frequency",
};

export type CurrencyCode = "RUB" | "USD" | "EUR" | "UZS" | "KZT" | "GBP";

export interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

/** Extensible currency list — add entries here to support more currencies */
export const CURRENCIES: CurrencyOption[] = [
  { code: "RUB", symbol: "₽", label: "RUB — ₽" },
  { code: "USD", symbol: "$", label: "USD — $" },
  { code: "EUR", symbol: "€", label: "EUR — €" },
  { code: "UZS", symbol: "сум", label: "UZS — сум" },
  { code: "KZT", symbol: "₸", label: "KZT — ₸" },
  { code: "GBP", symbol: "£", label: "GBP — £" },
];

export function getCurrency(code: string | undefined): CurrencyOption {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  last_login_at?: string | null;
}

/** Stored user row (local JSON) — password never sent to clients */
export interface UserRecord extends User {
  password_hash: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  client_id: string;
  created_at: string;
}

export interface Platform {
  id: string;
  name: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  client_id: string;
  brand_id?: string | null;
  platform_id: string;
  name: string;
  start_date: string;
  end_date: string;
  currency: CurrencyCode;
  primary_kpi: KpiType;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export interface CampaignKpi {
  id: string;
  campaign_id: string;
  kpi_type: KpiType;
  planned_value: number;
  created_at: string;
}

export interface DailyMetric {
  id: string;
  campaign_id: string;
  date: string;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  spend: number | null;
  conversions: number | null;
  video_views: number | null;
  created_at: string;
  updated_at: string;
}

export interface KpiMetrics {
  kpiType: KpiType;
  totalPlan: number;
  /** null when no daily values exist for this KPI */
  totalFact: number | null;
  remaining: number;
  progress: number;
  expectedFact: number;
  pacing: number | null;
  dailyPlan: number;
  actualDailyAverage: number;
  daysFact: number;
  daysRemaining: number;
  totalCampaignDays: number;
  missingDays: number;
  isCumulative: boolean;
  hasFact: boolean;
}

export interface CalculatedMetrics {
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  vtr: number | null;
  frequency: number | null;
}

export interface CalculatedMetricComparison {
  key: CalculatedMetricType;
  plan: number | null;
  fact: number | null;
  difference: number | null;
  /** money | pp (percentage points) | number */
  unit: "money" | "pp" | "number" | "percent";
  /** true for CPM/CPC/CPA — lower fact is usually better */
  lowerIsBetter: boolean;
}

export interface DailyRow {
  date: string;
  /** Plan for this day (additive) or cumulative reach plan for the day */
  dailyPlan: number;
  /** Actual for this day (additive) or cumulative reach fact */
  actual: number;
  difference: number;
  cumulativePlan: number;
  cumulativeFact: number;
  /** Daily pacing = Actual / Daily Plan × 100 (or cumulative for Reach) */
  pacing: number | null;
  hasData: boolean;
}

export interface DailyCalculatedRow {
  date: string;
  hasData: boolean;
  impressions: number | null;
  reach: number | null;
  /** Reach(day) − Reach(previous day); for first day = Reach */
  reachIncrement: number | null;
  clicks: number | null;
  spend: number | null;
  conversions: number | null;
  video_views: number | null;
  cumulativeImpressions: number;
  cumulativeReach: number | null;
  calculated: CalculatedMetrics;
}

export interface ChartPoint {
  date: string;
  label: string;
  expectedCumulative: number;
  actualCumulative: number | null;
  dailyPlan?: number | null;
  dailyFact?: number | null;
}

export interface CampaignWithRelations extends Campaign {
  client: Client;
  brand?: Brand | null;
  platform: Platform;
  kpis: CampaignKpi[];
  daily_metrics: DailyMetric[];
}

export interface CampaignSummary {
  campaign: CampaignWithRelations;
  primaryKpi: KpiType;
  metrics: KpiMetrics | null;
  allMetrics: KpiMetrics[];
  calculated: CalculatedMetrics;
  calculatedPlan: CalculatedMetrics;
  calculatedComparisons: CalculatedMetricComparison[];
  status: CampaignStatus;
  daysLabel: string;
  missingDays: number;
  factByKpi: Partial<Record<KpiType, number>>;
  /** Presence of confirming screenshots (optional; filled by list/dashboard). */
  screenshotStatus?: {
    launch: boolean;
    reporting: boolean;
  };
}

export interface DashboardStats {
  active: number;
  onTrack: number;
  attention: number;
  critical: number;
  completed: number;
}

export interface PerformanceSummary {
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalConversions: number;
  /** Not deduplicated across campaigns — avoid calling "Total Reach" */
  campaignReachSum: number | null;
  hasReach: boolean;
}

export interface DailyUpdateItem {
  campaignId: string;
  campaignName: string;
  clientName: string;
  platformName: string;
  yesterday: string;
  hasData: boolean;
}

export interface DataStore {
  users: UserRecord[];
  clients: Client[];
  platforms: Platform[];
  campaigns: Campaign[];
  campaign_kpis: CampaignKpi[];
  daily_metrics: DailyMetric[];
}
