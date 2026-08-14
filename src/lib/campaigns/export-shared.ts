import {
  endOfMonth,
  max as maxDate,
  min as minDate,
  startOfMonth,
  subDays,
} from "date-fns";
import { parseDate, toDateString } from "@/lib/calculations";
import type { KpiType } from "@/lib/types";

export const EXPORT_KPI_LABELS: Record<KpiType, string> = {
  impressions: "Impressions",
  reach: "Reach",
  clicks: "Clicks",
  spend: "Spend",
  conversions: "Conversions",
  video_views: "Views",
};

export function sanitizeCampaignFilename(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || "campaign";
}

export function formatExportFilename(
  campaignName: string,
  startDate: string,
  endDate: string
): string {
  const start = startDate.slice(0, 10).split("-").reverse().join(".");
  const end = endDate.slice(0, 10).split("-").reverse().join(".");
  return `${sanitizeCampaignFilename(campaignName)}_${start}_${end}.xlsx`;
}

export function campaignDatePresets(campaignStart: string, campaignEnd: string) {
  const start = parseDate(campaignStart);
  const end = parseDate(campaignEnd);
  const today = parseDate(toDateString(new Date()));

  const monthStart = maxDate([start, startOfMonth(today)]);
  const monthEnd = minDate([end, endOfMonth(today)]);
  const currentMonth =
    monthStart.getTime() <= monthEnd.getTime()
      ? { start: toDateString(monthStart), end: toDateString(monthEnd) }
      : { start: campaignStart.slice(0, 10), end: campaignEnd.slice(0, 10) };

  const weekEnd = minDate([end, today < start ? start : today]);
  const weekStart = maxDate([start, subDays(weekEnd, 6)]);

  return {
    full: {
      start: campaignStart.slice(0, 10),
      end: campaignEnd.slice(0, 10),
    },
    currentMonth,
    last7: {
      start: toDateString(weekStart),
      end: toDateString(weekEnd),
    },
  };
}
