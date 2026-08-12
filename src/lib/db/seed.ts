import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import type { CampaignStatus } from "@/lib/config/pacing";
import type {
  CurrencyCode,
  DataStore,
  DailyMetric,
  KpiType,
} from "@/lib/types";
import { toDateString } from "@/lib/calculations";

function metric(
  campaignId: string,
  date: string,
  values: Partial<Record<KpiType, number>>
): DailyMetric {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    campaign_id: campaignId,
    date,
    impressions: values.impressions ?? null,
    reach: values.reach ?? null,
    clicks: values.clicks ?? null,
    spend: values.spend ?? null,
    conversions: values.conversions ?? null,
    video_views: values.video_views ?? null,
    created_at: now,
    updated_at: now,
  };
}

type SeedDef = {
  id: string;
  name: string;
  client: "abbott" | "bayer" | "sanofi";
  platformIndex: number;
  startOffset: number;
  endOffset: number;
  previousMonth?: boolean;
  statusHint: CampaignStatus;
  rate: number;
  skipLast?: number;
  currency: CurrencyCode;
  primary_kpi: KpiType;
  kpis: Partial<Record<KpiType, number>>;
  /** starting reach + daily growth for cumulative reach */
  reachStart?: number;
  reachGrowth?: number;
};

export function createSeedStore(today = new Date()): DataStore {
  const now = today.toISOString();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const prevStart = startOfMonth(subMonths(today, 1));
  const prevEnd = endOfMonth(subMonths(today, 1));

  const clients = [
    { id: "c-abbott", name: "Abbott", created_at: now },
    { id: "c-bayer", name: "Bayer", created_at: now },
    { id: "c-sanofi", name: "Sanofi", created_at: now },
  ];

  const platforms = [
    "Google Ads",
    "Meta",
    "BYYD",
    "Eskimi",
    "Megogo",
    "YADRO",
    "DV360",
    "Яндекс Директ",
  ].map((name, i) => ({
    id: `p-${i + 1}`,
    name,
    created_at: now,
  }));

  const defs: SeedDef[] = [
    {
      id: "camp-duspatalin",
      name: "Duspatalin",
      client: "abbott",
      platformIndex: 0,
      startOffset: 0,
      endOffset: 0,
      statusHint: "on_track",
      rate: 1.08,
      currency: "RUB",
      primary_kpi: "impressions",
      kpis: {
        impressions: 1_500_000,
        reach: 600_000,
        clicks: 45_000,
        spend: 930_000,
        conversions: 1_200,
      },
      reachStart: 45_000,
      reachGrowth: 42_000,
    },
    {
      id: "camp-humira-awareness",
      name: "Humira Awareness",
      client: "abbott",
      platformIndex: 4,
      startOffset: 0,
      endOffset: 0,
      statusHint: "on_track",
      rate: 1.05,
      currency: "RUB",
      primary_kpi: "video_views",
      kpis: {
        impressions: 2_200_000,
        reach: 900_000,
        clicks: 38_000,
        spend: 780_000,
        video_views: 450_000,
      },
      reachStart: 70_000,
      reachGrowth: 60_000,
    },
    {
      id: "camp-klacid",
      name: "Klacid",
      client: "abbott",
      platformIndex: 5,
      startOffset: 0,
      endOffset: 0,
      statusHint: "on_track",
      rate: 1.1,
      currency: "USD",
      primary_kpi: "spend",
      kpis: { impressions: 980_000, reach: 400_000, clicks: 29_000, spend: 12_000 },
      reachStart: 30_000,
      reachGrowth: 28_000,
    },
    {
      id: "camp-creon",
      name: "Creon",
      client: "abbott",
      platformIndex: 1,
      startOffset: 0,
      endOffset: 0,
      statusHint: "attention",
      rate: 1.0,
      skipLast: 1,
      currency: "RUB",
      primary_kpi: "impressions",
      kpis: { impressions: 900_000, reach: 380_000, clicks: 27_000, spend: 620_000 },
      reachStart: 28_000,
      reachGrowth: 26_000,
    },
    {
      id: "camp-brufen",
      name: "Brufen",
      client: "abbott",
      platformIndex: 7,
      startOffset: 0,
      endOffset: 0,
      statusHint: "attention",
      rate: 0.95,
      skipLast: 1,
      currency: "RUB",
      primary_kpi: "impressions",
      kpis: {
        impressions: 1_100_000,
        reach: 500_000,
        clicks: 33_000,
        spend: 510_000,
        conversions: 900,
      },
      reachStart: 35_000,
      reachGrowth: 32_000,
    },
    {
      id: "camp-synthroid",
      name: "Synthroid",
      client: "abbott",
      platformIndex: 6,
      startOffset: 3,
      endOffset: 5,
      statusHint: "attention",
      rate: 0.93,
      currency: "EUR",
      primary_kpi: "clicks",
      kpis: { impressions: 1_350_000, reach: 520_000, spend: 18_000, clicks: 28_000 },
      reachStart: 40_000,
      reachGrowth: 35_000,
    },
    {
      id: "camp-pechen",
      name: "Pechen",
      client: "abbott",
      platformIndex: 2,
      startOffset: 0,
      endOffset: 0,
      statusHint: "critical",
      rate: 0.7,
      skipLast: 2,
      currency: "RUB",
      primary_kpi: "impressions",
      kpis: {
        impressions: 800_000,
        reach: 320_000,
        spend: 480_000,
        video_views: 200_000,
      },
      reachStart: 22_000,
      reachGrowth: 18_000,
    },
    {
      id: "camp-holkira",
      name: "Holkira Pak",
      client: "abbott",
      platformIndex: 3,
      startOffset: 0,
      endOffset: 0,
      statusHint: "critical",
      rate: 0.68,
      skipLast: 2,
      currency: "RUB",
      primary_kpi: "impressions",
      kpis: { impressions: 640_000, reach: 250_000, clicks: 12_000, spend: 390_000 },
      reachStart: 18_000,
      reachGrowth: 15_000,
    },
    {
      id: "camp-ensure",
      name: "Ensure Growth",
      client: "abbott",
      platformIndex: 1,
      startOffset: 2,
      endOffset: 0,
      statusHint: "critical",
      rate: 0.72,
      skipLast: 1,
      currency: "RUB",
      primary_kpi: "conversions",
      kpis: {
        impressions: 1_800_000,
        reach: 700_000,
        clicks: 42_000,
        spend: 860_000,
        conversions: 1_500,
      },
      reachStart: 50_000,
      reachGrowth: 40_000,
    },
    {
      id: "camp-duphalac",
      name: "Duphalac Brand",
      client: "abbott",
      platformIndex: 3,
      startOffset: 0,
      endOffset: 0,
      previousMonth: true,
      statusHint: "completed",
      rate: 1.0,
      currency: "RUB",
      primary_kpi: "impressions",
      kpis: { impressions: 500_000, reach: 220_000, clicks: 15_000, spend: 310_000 },
      reachStart: 8_000,
      reachGrowth: 7_000,
    },
    {
      id: "camp-androsurge",
      name: "Androgel Q2",
      client: "abbott",
      platformIndex: 0,
      startOffset: 0,
      endOffset: 0,
      previousMonth: true,
      statusHint: "completed",
      rate: 0.98,
      currency: "USD",
      primary_kpi: "spend",
      kpis: {
        impressions: 720_000,
        reach: 300_000,
        clicks: 18_000,
        spend: 9_500,
        conversions: 620,
      },
      reachStart: 10_000,
      reachGrowth: 9_500,
    },
    {
      id: "camp-freestyle",
      name: "FreeStyle Libre",
      client: "abbott",
      platformIndex: 6,
      startOffset: 0,
      endOffset: 0,
      previousMonth: true,
      statusHint: "completed",
      rate: 1.02,
      currency: "EUR",
      primary_kpi: "impressions",
      kpis: {
        impressions: 1_050_000,
        reach: 420_000,
        spend: 14_000,
        video_views: 310_000,
      },
      reachStart: 14_000,
      reachGrowth: 13_000,
    },
    {
      id: "camp-aspirin",
      name: "Aspirin Cardio",
      client: "bayer",
      platformIndex: 7,
      startOffset: 0,
      endOffset: 0,
      statusHint: "on_track",
      rate: 1.06,
      currency: "RUB",
      primary_kpi: "impressions",
      kpis: {
        impressions: 700_000,
        reach: 280_000,
        clicks: 21_000,
        spend: 450_000,
        conversions: 800,
      },
      reachStart: 22_000,
      reachGrowth: 20_000,
    },
    {
      id: "camp-essentiale",
      name: "Essentiale",
      client: "sanofi",
      platformIndex: 6,
      startOffset: 4,
      endOffset: 5,
      statusHint: "attention",
      rate: 0.92,
      currency: "RUB",
      primary_kpi: "spend",
      kpis: { impressions: 1_200_000, reach: 480_000, spend: 750_000 },
      reachStart: 40_000,
      reachGrowth: 36_000,
    },
  ];

  const clientId = (key: SeedDef["client"]) =>
    key === "abbott" ? "c-abbott" : key === "bayer" ? "c-bayer" : "c-sanofi";

  const campaigns = defs.map((d) => {
    const start = d.previousMonth ? prevStart : addDays(monthStart, d.startOffset);
    const end = d.previousMonth ? prevEnd : addDays(monthEnd, d.endOffset);
    return {
      id: d.id,
      client_id: clientId(d.client),
      platform_id: platforms[d.platformIndex].id,
      name: d.name,
      start_date: toDateString(start),
      end_date: toDateString(end),
      currency: d.currency,
      primary_kpi: d.primary_kpi,
      status: d.statusHint,
      created_at: now,
      updated_at: now,
    };
  });

  const campaign_kpis = defs.flatMap((d) =>
    (Object.entries(d.kpis) as [KpiType, number][]).map(([kpi_type, planned_value]) => ({
      id: crypto.randomUUID(),
      campaign_id: d.id,
      kpi_type,
      planned_value,
      created_at: now,
    }))
  );

  const daily_metrics: DailyMetric[] = [];

  for (const d of defs) {
    const start = d.previousMonth ? prevStart : addDays(monthStart, d.startOffset);
    const end = d.previousMonth ? prevEnd : addDays(monthEnd, d.endOffset);
    const totalDays = differenceInCalendarDays(end, start) + 1;

    let daysToFill: number;
    if (d.previousMonth) {
      daysToFill = totalDays;
    } else {
      const campaignDaysFact = Math.max(
        0,
        differenceInCalendarDays(
          startOfDay(today) > end ? end : startOfDay(today),
          start
        ) + 1
      );
      daysToFill = Math.max(0, campaignDaysFact - 1);
    }

    const fillCount = Math.max(0, daysToFill - (d.previousMonth ? 0 : d.skipLast ?? 0));
    let cumReach = d.reachStart ?? 0;

    for (let i = 0; i < fillCount; i++) {
      const values: Partial<Record<KpiType, number>> = {};
      for (const [kpi, plan] of Object.entries(d.kpis) as [KpiType, number][]) {
        if (kpi === "reach") continue;
        values[kpi] = Math.round((plan / totalDays) * d.rate);
      }
      if (d.kpis.reach) {
        cumReach += d.reachGrowth ?? Math.round((d.kpis.reach / totalDays) * d.rate);
        // Cap near plan * progress
        const maxReach = Math.round(d.kpis.reach * ((i + 1) / totalDays) * 1.15);
        values.reach = Math.min(cumReach, maxReach);
      }
      daily_metrics.push(metric(d.id, toDateString(addDays(start, i)), values));
    }
  }

  return {
    users: [
      {
        id: "u-anna",
        email: "anna@agency.com",
        name: "Анна Иванова",
        role: "employee",
        created_at: now,
      },
    ],
    clients,
    platforms,
    campaigns,
    campaign_kpis,
    daily_metrics,
  };
}

export function describeSeed(): string {
  return `Seed generated for ${format(new Date(), "yyyy-MM-dd")}`;
}
