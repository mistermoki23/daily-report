import type { KpiType } from "@/lib/types";

/** Plan KPIs editable in the campaign plan form (Views = video_views). */
export const EDITABLE_PLAN_KPIS = [
  "impressions",
  "reach",
  "clicks",
  "spend",
  "video_views",
] as const satisfies readonly KpiType[];

export type EditablePlanKpi = (typeof EDITABLE_PLAN_KPIS)[number];
