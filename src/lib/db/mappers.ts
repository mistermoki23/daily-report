import type { CampaignStatus } from "@/lib/config/pacing";
import type {
  Campaign,
  CampaignKpi,
  CampaignWithRelations,
  Client,
  CurrencyCode,
  DailyMetric,
  KpiType,
  Platform,
  User,
} from "@/lib/types";
import type {
  Campaign as PrismaCampaign,
  CampaignPlan,
  Client as PrismaClientModel,
  DailyData,
  Platform as PrismaPlatform,
  User as PrismaUser,
} from "@prisma/client";

type CampaignFull = PrismaCampaign & {
  client: PrismaClientModel;
  platform: PrismaPlatform;
  plan: CampaignPlan | null;
  dailyData: DailyData[];
};

function dateToString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function decimalToNumber(value: { toString(): string } | null | undefined): number | null {
  if (value == null) return null;
  return Number(value.toString());
}

export function mapUser(row: PrismaUser): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    created_at: row.createdAt.toISOString(),
  };
}

export function mapClient(row: PrismaClientModel): Client {
  return {
    id: row.id,
    name: row.name,
    created_at: row.createdAt.toISOString(),
  };
}

export function mapPlatform(row: PrismaPlatform): Platform {
  return {
    id: row.id,
    name: row.name,
    created_at: row.createdAt.toISOString(),
  };
}

export function mapCampaign(row: PrismaCampaign): Campaign {
  return {
    id: row.id,
    client_id: row.clientId,
    platform_id: row.platformId,
    name: row.name,
    start_date: dateToString(row.startDate),
    end_date: dateToString(row.endDate),
    currency: row.currency as CurrencyCode,
    primary_kpi: row.primaryKpi as KpiType,
    status: row.status as CampaignStatus,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function planToKpis(plan: CampaignPlan | null, campaignId: string): CampaignKpi[] {
  if (!plan) return [];
  const created = plan.createdAt.toISOString();
  const entries: { kpi_type: KpiType; value: number | null }[] = [
    { kpi_type: "impressions", value: decimalToNumber(plan.impressions) },
    { kpi_type: "reach", value: decimalToNumber(plan.reach) },
    { kpi_type: "clicks", value: decimalToNumber(plan.clicks) },
    { kpi_type: "spend", value: decimalToNumber(plan.spend) },
    { kpi_type: "video_views", value: decimalToNumber(plan.videoViews) },
    { kpi_type: "conversions", value: decimalToNumber(plan.conversions) },
  ];
  return entries
    .filter((e) => e.value != null && e.value > 0)
    .map((e) => ({
      id: `${plan.id}-${e.kpi_type}`,
      campaign_id: campaignId,
      kpi_type: e.kpi_type,
      planned_value: e.value as number,
      created_at: created,
    }));
}

export function mapDaily(row: DailyData): DailyMetric {
  return {
    id: row.id,
    campaign_id: row.campaignId,
    date: dateToString(row.date),
    impressions: decimalToNumber(row.impressions),
    reach: decimalToNumber(row.reachCumulative),
    clicks: decimalToNumber(row.clicks),
    spend: decimalToNumber(row.spend),
    conversions: decimalToNumber(row.conversions),
    video_views: decimalToNumber(row.videoViews),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function mapCampaignWithRelations(row: CampaignFull): CampaignWithRelations {
  const campaign = mapCampaign(row);
  return {
    ...campaign,
    client: mapClient(row.client),
    platform: mapPlatform(row.platform),
    kpis: planToKpis(row.plan, row.id),
    daily_metrics: [...row.dailyData]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(mapDaily),
  };
}

export function kpisToPlanFields(
  kpis: { kpi_type: KpiType; planned_value: number }[]
): {
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  spend: number | null;
  videoViews: number | null;
  conversions: number | null;
} {
  const map = new Map(kpis.map((k) => [k.kpi_type, k.planned_value]));
  const pick = (type: KpiType) => {
    const v = map.get(type);
    return v != null && v > 0 ? v : null;
  };
  return {
    impressions: pick("impressions"),
    reach: pick("reach"),
    clicks: pick("clicks"),
    spend: pick("spend"),
    videoViews: pick("video_views"),
    conversions: pick("conversions"),
  };
}
