import "server-only";

import type { CurrencyCode, KpiType as PrismaKpiType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma-client";
import { isAdminRole } from "@/lib/auth/roles";
import { canDelete, canEdit } from "@/lib/auth/permissions";
import { AuthError } from "@/lib/auth/current-user";
import { userHasReportAccess } from "@/lib/auth/report-access";
import { logActivity } from "@/lib/auth/activity";
import { buildCampaignSummary } from "@/lib/calculations";
import {
  kpisToPlanFields,
  mapCampaignWithRelations,
} from "@/lib/db/mappers";
import {
  CURRENCIES,
  KPI_LABELS,
  KPI_TYPES,
  type CurrencyCode as AppCurrency,
  type KpiType,
  type User,
} from "@/lib/types";


const campaignInclude = {
  client: true,
  platform: true,
  plan: true,
  dailyData: { orderBy: { date: "asc" as const } },
} as const;

const ALLOWED_PRIMARY = new Set<string>(KPI_TYPES);
const ALLOWED_CURRENCY = new Set(CURRENCIES.map((c) => c.code));

function decimalToNumber(
  value: { toString(): string } | null | undefined
): number | null {
  if (value == null) return null;
  return Number(value.toString());
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function str(v: string | number | null | undefined): string | null {
  if (v == null) return null;
  return String(v);
}

function valuesEqual(
  a: number | null | undefined,
  b: number | null | undefined
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

export async function canAccessCampaign(
  userId: string,
  campaignId: string,
  role?: string,
  opts?: { includeDeleted?: boolean }
): Promise<boolean> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, deletedAt: true },
  });
  if (!campaign) return false;
  if (campaign.deletedAt && !opts?.includeDeleted && !isAdminRole(role)) {
    return false;
  }
  if (isAdminRole(role)) return true;
  if (campaign.deletedAt) return false;
  return userHasReportAccess(userId, campaignId);
}

export type CampaignUpdateInput = {
  name: string;
  client_id: string;
  platform_id: string;
  start_date: string;
  end_date: string;
  currency: AppCurrency;
  primary_kpi: KpiType;
  kpis: { kpi_type: KpiType; planned_value: number }[];
};

export async function updateCampaignFull(
  campaignId: string,
  user: User,
  input: CampaignUpdateInput
) {
  if (!canEdit(user.role)) {
    throw new AuthError("Недостаточно прав для изменения данных", 403);
  }
  const allowed = await canAccessCampaign(user.id, campaignId, user.role);
  if (!allowed) throw new Error("Кампания не найдена");

  const name = input.name.trim();
  if (!name) throw new Error("Название кампании обязательно");

  const start = input.start_date?.slice(0, 10);
  const end = input.end_date?.slice(0, 10);
  if (!start || !end || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
    throw new Error("Даты кампании некорректны");
  }
  if (end < start) {
    throw new Error("Дата окончания не может быть раньше даты начала");
  }

  if (!ALLOWED_CURRENCY.has(input.currency)) {
    throw new Error("Некорректная валюта");
  }
  if (!ALLOWED_PRIMARY.has(input.primary_kpi)) {
    throw new Error("Primary KPI должен быть одним из разрешённых значений");
  }

  const client = await prisma.client.findUnique({ where: { id: input.client_id } });
  if (!client) throw new Error("Клиент не найден");
  const platform = await prisma.platform.findUnique({
    where: { id: input.platform_id },
  });
  if (!platform) throw new Error("Площадка не найдена");

  for (const k of input.kpis) {
    if (!ALLOWED_PRIMARY.has(k.kpi_type)) {
      throw new Error(`Неизвестный KPI: ${k.kpi_type}`);
    }
    if (typeof k.planned_value !== "number" || Number.isNaN(k.planned_value)) {
      throw new Error(`Некорректное значение для ${KPI_LABELS[k.kpi_type] ?? k.kpi_type}`);
    }
    if (k.planned_value < 0) {
      throw new Error("Плановые значения не могут быть отрицательными");
    }
  }

  const activeKpis = input.kpis.filter((k) => k.planned_value > 0);
  if (activeKpis.length === 0) {
    throw new Error("Укажите хотя бы один плановый KPI больше нуля");
  }
  if (!activeKpis.some((k) => k.kpi_type === input.primary_kpi)) {
    throw new Error("Primary KPI должен быть среди выбранных KPI");
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, deletedAt: null },
    include: { plan: true, client: true, platform: true },
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

  const nextPlan: Record<KpiType, number | null> = {
    impressions: null,
    reach: null,
    clicks: null,
    spend: null,
    conversions: null,
    video_views: null,
  };
  for (const k of activeKpis) {
    nextPlan[k.kpi_type] = k.planned_value;
  }

  const metaChanges: {
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }[] = [];

  if (campaign.name !== name) {
    metaChanges.push({ field: "name", oldValue: campaign.name, newValue: name });
  }
  if (campaign.clientId !== input.client_id) {
    metaChanges.push({
      field: "client_id",
      oldValue: `${campaign.client.name} (${campaign.clientId})`,
      newValue: `${client.name} (${input.client_id})`,
    });
  }
  if (campaign.platformId !== input.platform_id) {
    metaChanges.push({
      field: "platform_id",
      oldValue: `${campaign.platform.name} (${campaign.platformId})`,
      newValue: `${platform.name} (${input.platform_id})`,
    });
  }
  if (dateOnly(campaign.startDate) !== start) {
    metaChanges.push({
      field: "start_date",
      oldValue: dateOnly(campaign.startDate),
      newValue: start,
    });
  }
  if (dateOnly(campaign.endDate) !== end) {
    metaChanges.push({
      field: "end_date",
      oldValue: dateOnly(campaign.endDate),
      newValue: end,
    });
  }
  if (campaign.currency !== input.currency) {
    metaChanges.push({
      field: "currency",
      oldValue: campaign.currency,
      newValue: input.currency,
    });
  }
  if (campaign.primaryKpi !== input.primary_kpi) {
    metaChanges.push({
      field: "primary_kpi",
      oldValue: campaign.primaryKpi,
      newValue: input.primary_kpi,
    });
  }

  const planChanges: {
    field: string;
    oldValue: number | null;
    newValue: number | null;
  }[] = [];

  for (const field of KPI_TYPES) {
    const oldNorm =
      oldPlan[field] != null && oldPlan[field]! > 0 ? oldPlan[field] : null;
    const newNorm =
      nextPlan[field] != null && nextPlan[field]! > 0 ? nextPlan[field] : null;
    if (!valuesEqual(oldNorm, newNorm)) {
      planChanges.push({ field, oldValue: oldNorm, newValue: newNorm });
    }
  }

  if (metaChanges.length === 0 && planChanges.length === 0) {
    const row = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: campaignInclude,
    });
    if (!row) throw new Error("Кампания не найдена");
    return buildCampaignSummary(mapCampaignWithRelations(row));
  }

  const planFields = kpisToPlanFields(activeKpis);

  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id: campaignId },
      data: {
        name,
        clientId: input.client_id,
        platformId: input.platform_id,
        startDate: parseDateOnly(start),
        endDate: parseDateOnly(end),
        currency: input.currency as CurrencyCode,
        primaryKpi: input.primary_kpi as PrismaKpiType,
      },
    });

    await tx.campaignPlan.upsert({
      where: { campaignId },
      create: { campaignId, ...planFields },
      update: planFields,
    });

    if (planChanges.length > 0) {
      await tx.planChangeLog.createMany({
        data: planChanges.map((c) => ({
          campaignId,
          userId: user.id,
          userEmail: user.email,
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
        })),
      });
    }

    if (metaChanges.length > 0 || planChanges.length > 0) {
      await tx.campaignChangeLog.createMany({
        data: [
          ...metaChanges.map((c) => ({
            campaignId,
            userId: user.id,
            userEmail: user.email,
            action: "EDIT" as const,
            field: c.field,
            oldValue: c.oldValue,
            newValue: c.newValue,
          })),
          ...planChanges.map((c) => ({
            campaignId,
            userId: user.id,
            userEmail: user.email,
            action: "EDIT" as const,
            field: c.field,
            oldValue: str(c.oldValue),
            newValue: str(c.newValue),
          })),
        ],
      });
    }
  });

  await logActivity({
    userId: user.id,
    action: "REPORT_UPDATED",
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

export async function softDeleteCampaign(campaignId: string, user: User) {
  if (!canDelete(user.role)) {
    throw new AuthError("Недостаточно прав для удаления", 403);
  }
  const allowed = await canAccessCampaign(user.id, campaignId, user.role);
  if (!allowed) throw new Error("Кампания не найдена");

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, deletedAt: null },
  });
  if (!campaign) throw new Error("Кампания не найдена");

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id: campaignId },
      data: { deletedAt: now },
    });
    await tx.campaignChangeLog.create({
      data: {
        campaignId,
        userId: user.id,
        userEmail: user.email,
        action: "DELETE",
        field: "deleted_at",
        oldValue: null,
        newValue: now.toISOString(),
      },
    });
  });

  return { ok: true };
}

export async function restoreCampaign(campaignId: string, user: User) {
  if (!isAdminRole(user.role)) {
    throw new AuthError("Требуются права администратора", 403);
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, deletedAt: { not: null } },
  });
  if (!campaign) throw new Error("Удалённая кампания не найдена");

  const prev = campaign.deletedAt?.toISOString() ?? null;
  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id: campaignId },
      data: { deletedAt: null },
    });
    await tx.campaignChangeLog.create({
      data: {
        campaignId,
        userId: user.id,
        userEmail: user.email,
        action: "RESTORE",
        field: "deleted_at",
        oldValue: prev,
        newValue: null,
      },
    });
  });

  return { ok: true };
}

export async function listDeletedCampaigns() {
  const rows = await prisma.campaign.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: {
      client: true,
      platform: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    clientName: r.client.name,
    platformName: r.platform.name,
    deletedAt: r.deletedAt!.toISOString(),
    status: r.status,
    primaryKpi: r.primaryKpi,
  }));
}

export async function listCampaignChangeHistory(limit = 200) {
  const rows = await prisma.campaignChangeLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, limit)),
    include: {
      campaign: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    field: r.field,
    fieldLabel: KPI_LABELS[r.field as KpiType] ?? r.field,
    oldValue: r.oldValue,
    newValue: r.newValue,
    createdAt: r.createdAt.toISOString(),
    userEmail: r.userEmail,
    userId: r.userId,
    user: r.user,
    campaignId: r.campaignId,
    campaign: r.campaign,
  }));
}
