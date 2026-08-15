import "server-only";

import { prisma } from "@/lib/db/prisma-client";
import { logActivity } from "@/lib/auth/activity";
import { buildCampaignSummary } from "@/lib/calculations";
import {
  kpisToPlanFields,
  mapCampaignWithRelations,
} from "@/lib/db/mappers";
import { KPI_LABELS, type KpiType, type User } from "@/lib/types";
import {
  EDITABLE_PLAN_KPIS,
  type EditablePlanKpi,
} from "@/lib/campaigns/plan-fields";
import { canAccessCampaign } from "@/lib/campaigns/manage";
import { canEdit } from "@/lib/auth/permissions";
import { AuthError } from "@/lib/auth/current-user";

export { EDITABLE_PLAN_KPIS, type EditablePlanKpi, canAccessCampaign };

const campaignInclude = {
  client: true,
  brand: true,
  platform: true,
  plan: true,
  dailyData: { orderBy: { date: "asc" as const } },
} as const;

function decimalToNumber(
  value: { toString(): string } | null | undefined
): number | null {
  if (value == null) return null;
  return Number(value.toString());
}

function valuesEqual(
  a: number | null | undefined,
  b: number | null | undefined
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

function str(v: number | null | undefined): string | null {
  if (v == null) return null;
  return String(v);
}

export async function updateCampaignPlan(
  campaignId: string,
  user: User,
  input: Partial<Record<EditablePlanKpi, number | null>>
) {
  if (!canEdit(user.role)) {
    throw new AuthError("Недостаточно прав для изменения данных", 403);
  }
  const allowed = await canAccessCampaign(user.id, campaignId, user.role);
  if (!allowed) throw new Error("Кампания не найдена");

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, deletedAt: null },
    include: { plan: true },
  });
  if (!campaign) throw new Error("Кампания не найдена");

  const oldPlan = {
    impressions: decimalToNumber(campaign.plan?.impressions),
    reach: decimalToNumber(campaign.plan?.reach),
    clicks: decimalToNumber(campaign.plan?.clicks),
    spend: decimalToNumber(campaign.plan?.spend),
    video_views: decimalToNumber(campaign.plan?.videoViews),
    conversions: decimalToNumber(campaign.plan?.conversions),
  };

  const next: Record<EditablePlanKpi, number | null> = {
    impressions:
      input.impressions !== undefined ? input.impressions : oldPlan.impressions,
    reach: input.reach !== undefined ? input.reach : oldPlan.reach,
    clicks: input.clicks !== undefined ? input.clicks : oldPlan.clicks,
    spend: input.spend !== undefined ? input.spend : oldPlan.spend,
    video_views:
      input.video_views !== undefined ? input.video_views : oldPlan.video_views,
  };

  for (const key of EDITABLE_PLAN_KPIS) {
    const value = next[key];
    if (value == null) continue;
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(`Некорректное значение для ${KPI_LABELS[key]}`);
    }
    if (value < 0) {
      throw new Error("Плановые значения не могут быть отрицательными");
    }
  }

  const positive = EDITABLE_PLAN_KPIS.filter((k) => (next[k] ?? 0) > 0);
  if (positive.length === 0) {
    throw new Error("Укажите хотя бы один плановый KPI больше нуля");
  }

  const primary = campaign.primaryKpi as KpiType;
  if (
    EDITABLE_PLAN_KPIS.includes(primary as EditablePlanKpi) &&
    !(next[primary as EditablePlanKpi] != null && next[primary as EditablePlanKpi]! > 0)
  ) {
    throw new Error(
      `Primary KPI (${KPI_LABELS[primary]}) должен иметь плановое значение больше нуля`
    );
  }

  const kpis = [
    ...EDITABLE_PLAN_KPIS.map((kpi_type) => ({
      kpi_type,
      planned_value: next[kpi_type] ?? 0,
    })),
    ...(oldPlan.conversions != null && oldPlan.conversions > 0
      ? [{ kpi_type: "conversions" as KpiType, planned_value: oldPlan.conversions }]
      : []),
  ].filter((k) => k.planned_value > 0);

  if (!kpis.some((k) => k.kpi_type === primary)) {
    throw new Error("Primary KPI должен быть среди выбранных KPI");
  }

  const planFields = kpisToPlanFields(kpis);
  // Preserve conversions if not in editable set
  if (oldPlan.conversions != null && oldPlan.conversions > 0) {
    planFields.conversions = oldPlan.conversions;
  } else {
    planFields.conversions = null;
  }

  const changes: {
    field: string;
    oldValue: number | null;
    newValue: number | null;
  }[] = [];

  for (const field of EDITABLE_PLAN_KPIS) {
    const oldValue = oldPlan[field];
    const newValue = next[field] != null && next[field]! > 0 ? next[field] : null;
    const oldNorm = oldValue != null && oldValue > 0 ? oldValue : null;
    if (!valuesEqual(oldNorm, newValue)) {
      changes.push({ field, oldValue: oldNorm, newValue });
    }
  }

  if (changes.length === 0) {
    const row = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: campaignInclude,
    });
    if (!row) throw new Error("Кампания не найдена");
    return buildCampaignSummary(mapCampaignWithRelations(row));
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaignPlan.upsert({
      where: { campaignId },
      create: { campaignId, ...planFields },
      update: planFields,
    });

    await tx.planChangeLog.createMany({
      data: changes.map((c) => ({
        campaignId,
        userId: user.id,
        userEmail: user.email,
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
      })),
    });

    await tx.campaignChangeLog.createMany({
      data: changes.map((c) => ({
        campaignId,
        userId: user.id,
        userEmail: user.email,
        action: "EDIT" as const,
        field: c.field,
        oldValue: str(c.oldValue),
        newValue: str(c.newValue),
      })),
    });
  });

  await logActivity({
    userId: user.id,
    action: "PLAN_UPDATED",
    reportId: campaignId,
  });

  const summaryRow = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: campaignInclude,
  });
  if (!summaryRow) throw new Error("Кампания не найдена");
  const summary = buildCampaignSummary(mapCampaignWithRelations(summaryRow));
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: summary.status },
  });
  return { ...summary, status: summary.status };
}

export async function listPlanChangeHistory(limit = 200) {
  const rows = await prisma.planChangeLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, limit)),
    include: {
      campaign: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    field: r.field,
    fieldLabel:
      KPI_LABELS[r.field as KpiType] ?? r.field,
    oldValue: decimalToNumber(r.oldValue),
    newValue: decimalToNumber(r.newValue),
    createdAt: r.createdAt.toISOString(),
    userEmail: r.userEmail,
    user: r.user,
    campaign: r.campaign,
  }));
}
