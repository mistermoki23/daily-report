import "server-only";

import { addDays, startOfDay, subDays } from "date-fns";
import {
  buildCampaignSummary,
  getFactValue,
  getMissingDates,
  toDateString,
} from "@/lib/calculations";
import type {
  CampaignSummary,
  DailyUpdateItem,
  DashboardStats,
  PerformanceSummary,
} from "@/lib/types";
import { db } from "@/lib/db";

export async function getDashboardData(
  userId: string,
  filters?: {
    clientId?: string;
    platformId?: string;
    status?: string;
    month?: string;
    search?: string;
    currency?: string;
  }
) {
  let summaries = await db.listCampaigns(userId);

  if (filters?.clientId) {
    summaries = summaries.filter((s) => s.campaign.client_id === filters.clientId);
  }
  if (filters?.platformId) {
    summaries = summaries.filter(
      (s) => s.campaign.platform_id === filters.platformId
    );
  }
  if (filters?.status) {
    summaries = summaries.filter((s) => s.status === filters.status);
  }
  if (filters?.currency) {
    summaries = summaries.filter((s) => s.campaign.currency === filters.currency);
  }
  if (filters?.month) {
    const [year, month] = filters.month.split("-").map(Number);
    summaries = summaries.filter((s) => {
      const start = s.campaign.start_date;
      const end = s.campaign.end_date;
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const monthEnd = `${year}-${String(month).padStart(2, "0")}-31`;
      return start <= monthEnd && end >= monthStart;
    });
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    summaries = summaries.filter(
      (s) =>
        s.campaign.name.toLowerCase().includes(q) ||
        s.campaign.client.name.toLowerCase().includes(q) ||
        s.campaign.platform.name.toLowerCase().includes(q)
    );
  }

  const stats: DashboardStats = {
    active: summaries.filter((s) => s.status !== "completed").length,
    onTrack: summaries.filter((s) => s.status === "on_track").length,
    attention: summaries.filter((s) => s.status === "attention").length,
    critical: summaries.filter((s) => s.status === "critical").length,
    completed: summaries.filter((s) => s.status === "completed").length,
  };

  const dailyUpdate = buildDailyUpdateCenter(summaries);
  const performance = buildPerformanceSummary(summaries);

  return { stats, campaigns: summaries, dailyUpdate, performance };
}

export function buildDailyUpdateCenter(
  summaries: CampaignSummary[],
  today = new Date()
): { count: number; items: DailyUpdateItem[] } {
  const yesterday = toDateString(subDays(startOfDay(today), 1));
  const items: DailyUpdateItem[] = [];

  for (const summary of summaries) {
    if (summary.status === "completed") continue;
    const { campaign } = summary;
    if (yesterday < campaign.start_date || yesterday > campaign.end_date) {
      continue;
    }
    const hasData = campaign.daily_metrics.some(
      (m) => m.date.slice(0, 10) === yesterday
    );
    // Only show campaigns that still need data (missing yesterday)
    if (hasData) continue;

    items.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      clientName: campaign.client.name,
      platformName: campaign.platform.name,
      yesterday,
      hasData: false,
    });
  }

  items.sort((a, b) => a.campaignName.localeCompare(b.campaignName, "ru"));

  return { count: items.length, items };
}

export function buildPerformanceSummary(
  summaries: CampaignSummary[]
): PerformanceSummary {
  const active = summaries.filter((s) => s.status !== "completed");
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalSpend = 0;
  let totalConversions = 0;
  let campaignReachSum = 0;
  let hasReach = false;

  for (const s of active) {
    const metrics = s.campaign.daily_metrics;
    const types = s.campaign.kpis.map((k) => k.kpi_type);
    if (types.includes("impressions")) {
      totalImpressions += getFactValue(metrics, "impressions");
    }
    if (types.includes("clicks")) {
      totalClicks += getFactValue(metrics, "clicks");
    }
    if (types.includes("spend")) {
      totalSpend += getFactValue(metrics, "spend");
    }
    if (types.includes("conversions")) {
      totalConversions += getFactValue(metrics, "conversions");
    }
    if (types.includes("reach")) {
      hasReach = true;
      campaignReachSum += getFactValue(metrics, "reach");
    }
  }

  return {
    totalImpressions,
    totalClicks,
    totalSpend,
    totalConversions,
    campaignReachSum: hasReach ? campaignReachSum : null,
    hasReach,
  };
}

export async function getClientsWithStats(userId: string) {
  const clients = await db.listClients();
  const campaigns = await db.listCampaigns(userId);
  return clients.map((client) => {
    const related = campaigns.filter((c) => c.campaign.client_id === client.id);
    const active = related.filter((c) => c.status !== "completed").length;
    return {
      ...client,
      activeCampaigns: active,
      totalCampaigns: related.length,
      status: active > 0 ? ("active" as const) : ("inactive" as const),
    };
  });
}

export { getMissingDates, buildCampaignSummary, addDays };
