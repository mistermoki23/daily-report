import "server-only";

import { Prisma } from "@prisma/client";
import { buildCampaignSummary } from "@/lib/calculations";
import { prisma } from "@/lib/db/prisma-client";
import {
  kpisToPlanFields,
  mapCampaignWithRelations,
  mapClient,
  mapDaily,
  mapPlatform,
} from "@/lib/db/mappers";
import type {
  CampaignSummary,
  CurrencyCode,
  KpiType,
} from "@/lib/types";

const campaignInclude = {
  client: true,
  platform: true,
  plan: true,
  dailyData: { orderBy: { date: "asc" as const } },
} satisfies Prisma.CampaignInclude;

function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

async function loadCampaignSummary(id: string): Promise<CampaignSummary | null> {
  const row = await prisma.campaign.findUnique({
    where: { id },
    include: campaignInclude,
  });
  if (!row) return null;
  return buildCampaignSummary(mapCampaignWithRelations(row));
}

async function syncCampaignStatus(id: string) {
  const summary = await loadCampaignSummary(id);
  if (!summary) return;
  await prisma.campaign.update({
    where: { id },
    data: { status: summary.status },
  });
}

export const prismaDb = {
  async reset() {
    const { hash } = await import("bcryptjs");
    await prisma.dailyData.deleteMany();
    await prisma.campaignPlan.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.platform.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await hash("demo1234", 12);
    const user = await prisma.user.create({
      data: {
        name: "Анна Иванова",
        email: "anna@agency.com",
        role: "employee",
        passwordHash,
      },
    });

    const client = await prisma.client.create({ data: { name: "Abbott" } });
    const platform = await prisma.platform.create({ data: { name: "BYYD" } });
    await prisma.campaign.create({
      data: {
        name: "Brufen",
        userId: user.id,
        clientId: client.id,
        platformId: platform.id,
        currency: "USD",
        startDate: new Date("2026-09-01T00:00:00.000Z"),
        endDate: new Date("2026-09-30T00:00:00.000Z"),
        primaryKpi: "impressions",
        status: "attention",
        plan: {
          create: {
            impressions: 1_000_000,
            reach: 200_000,
            clicks: 10_000,
            spend: 1_000,
            videoViews: 800_000,
            conversions: null,
          },
        },
        dailyData: {
          create: {
            date: new Date("2026-09-01T00:00:00.000Z"),
            impressions: 30_000,
            reachCumulative: 4_000,
            clicks: 300,
            spend: 10,
            videoViews: 27_000,
            conversions: null,
          },
        },
      },
    });

    const clients = await prisma.client.count();
    const campaigns = await prisma.campaign.count();
    return { clients: { length: clients }, campaigns: { length: campaigns } };
  },

  async getStore() {
    throw new Error("getStore доступен только в local JSON режиме");
  },

  async listClients() {
    const rows = await prisma.client.findMany({ orderBy: { name: "asc" } });
    return rows.map(mapClient);
  },

  async createClient(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Название клиента обязательно");
    try {
      const row = await prisma.client.create({ data: { name: trimmed } });
      return mapClient(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new Error("Клиент с таким названием уже существует");
      }
      throw e;
    }
  },

  async listPlatforms() {
    const rows = await prisma.platform.findMany({ orderBy: { name: "asc" } });
    return rows.map(mapPlatform);
  },

  async createPlatform(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Название площадки обязательно");
    try {
      const row = await prisma.platform.create({ data: { name: trimmed } });
      return mapPlatform(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new Error("Площадка с таким названием уже существует");
      }
      throw e;
    }
  },

  async listCampaigns(userId: string) {
    const rows = await prisma.campaign.findMany({
      where: { userId },
      include: campaignInclude,
      orderBy: { name: "asc" },
    });
    return rows.map((row) => buildCampaignSummary(mapCampaignWithRelations(row)));
  },

  async getCampaign(id: string, userId: string) {
    const row = await prisma.campaign.findFirst({
      where: { id, userId },
      include: campaignInclude,
    });
    if (!row) return null;
    return buildCampaignSummary(mapCampaignWithRelations(row));
  },

  async createCampaign(input: {
    user_id: string;
    client_id: string;
    platform_id: string;
    name: string;
    start_date: string;
    end_date: string;
    currency: CurrencyCode;
    primary_kpi: KpiType;
    kpis: { kpi_type: KpiType; planned_value: number }[];
  }) {
    if (!input.name.trim()) throw new Error("Название кампании обязательно");
    if (input.end_date < input.start_date) {
      throw new Error("Дата окончания не может быть раньше даты начала");
    }
    const owner = await prisma.user.findUnique({ where: { id: input.user_id } });
    if (!owner) throw new Error("Пользователь не найден");
    const client = await prisma.client.findUnique({ where: { id: input.client_id } });
    if (!client) throw new Error("Клиент не найден");
    const platform = await prisma.platform.findUnique({
      where: { id: input.platform_id },
    });
    if (!platform) throw new Error("Площадка не найдена");

    const activeKpis = input.kpis.filter((k) => k.planned_value > 0);
    if (activeKpis.length === 0) {
      throw new Error("Укажите хотя бы один плановый KPI");
    }
    if (activeKpis.some((k) => k.planned_value < 0)) {
      throw new Error("Плановые значения не могут быть отрицательными");
    }
    if (!activeKpis.some((k) => k.kpi_type === input.primary_kpi)) {
      throw new Error("Primary KPI должен быть среди выбранных KPI");
    }

    const plan = kpisToPlanFields(activeKpis);
    const row = await prisma.campaign.create({
      data: {
        name: input.name.trim(),
        userId: input.user_id,
        clientId: input.client_id,
        platformId: input.platform_id,
        currency: input.currency || "RUB",
        startDate: parseDateOnly(input.start_date),
        endDate: parseDateOnly(input.end_date),
        primaryKpi: input.primary_kpi,
        status: "attention",
        plan: { create: plan },
      },
      include: campaignInclude,
    });

    await syncCampaignStatus(row.id);
    const summary = await loadCampaignSummary(row.id);
    if (!summary) throw new Error("Кампания не найдена после создания");
    return summary;
  },

  async updateCampaign(
    id: string,
    userId: string,
    input: Partial<{
      name: string;
      client_id: string;
      platform_id: string;
      start_date: string;
      end_date: string;
      currency: CurrencyCode;
      primary_kpi: KpiType;
      kpis: { kpi_type: KpiType; planned_value: number }[];
    }>
  ) {
    const existing = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Кампания не найдена");

    const start = input.start_date
      ? parseDateOnly(input.start_date)
      : existing.startDate;
    const end = input.end_date ? parseDateOnly(input.end_date) : existing.endDate;
    if (end < start) {
      throw new Error("Дата окончания не может быть раньше даты начала");
    }

    await prisma.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id },
        data: {
          name: input.name !== undefined ? input.name.trim() : undefined,
          clientId: input.client_id,
          platformId: input.platform_id,
          startDate: input.start_date ? parseDateOnly(input.start_date) : undefined,
          endDate: input.end_date ? parseDateOnly(input.end_date) : undefined,
          currency: input.currency,
          primaryKpi: input.primary_kpi,
        },
      });

      if (input.kpis) {
        const active = input.kpis.filter((k) => k.planned_value > 0);
        for (const k of active) {
          if (k.planned_value < 0) {
            throw new Error("Плановые значения не могут быть отрицательными");
          }
        }
        const plan = kpisToPlanFields(active);
        await tx.campaignPlan.upsert({
          where: { campaignId: id },
          create: { campaignId: id, ...plan },
          update: plan,
        });
      }
    });

    await syncCampaignStatus(id);
    const summary = await loadCampaignSummary(id);
    if (!summary) throw new Error("Кампания не найдена");
    return summary;
  },

  async deleteCampaign(id: string, userId: string) {
    const result = await prisma.campaign.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new Error("Кампания не найдена");
  },

  async listDaily(campaignId: string, userId: string) {
    const owned = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!owned) throw new Error("Кампания не найдена");
    const rows = await prisma.dailyData.findMany({
      where: { campaignId },
      orderBy: { date: "asc" },
    });
    return rows.map(mapDaily);
  },

  async upsertDaily(
    campaignId: string,
    userId: string,
    input: {
      date: string;
      impressions?: number | null;
      reach?: number | null;
      clicks?: number | null;
      spend?: number | null;
      conversions?: number | null;
      video_views?: number | null;
    },
    options?: { allowUpdate?: boolean; id?: string }
  ) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!campaign) throw new Error("Кампания не найдена");

    const date = input.date.slice(0, 10);
    const start = campaign.startDate.toISOString().slice(0, 10);
    const end = campaign.endDate.toISOString().slice(0, 10);
    if (date < start) throw new Error("Дата не может быть раньше начала кампании");
    if (date > end) throw new Error("Дата не может быть позже конца кампании");

    const fields = [
      "impressions",
      "reach",
      "clicks",
      "spend",
      "conversions",
      "video_views",
    ] as const;
    for (const field of fields) {
      const value = input[field];
      if (typeof value === "number" && value < 0) {
        throw new Error("Нельзя вводить отрицательные значения");
      }
    }

    const dateObj = parseDateOnly(date);
    const prior = await prisma.dailyData.findMany({
      where: {
        campaignId,
        date: { lt: dateObj },
        ...(options?.id ? { NOT: { id: options.id } } : {}),
      },
      orderBy: { date: "asc" },
    });

    if (input.reach != null) {
      const priorImp = prior.reduce(
        (s, m) => s + (m.impressions ? Number(m.impressions) : 0),
        0
      );
      const dayImp = input.impressions ?? 0;
      const cumImp = priorImp + dayImp;
      if (input.reach > cumImp && cumImp > 0) {
        throw new Error(
          `Reach (${input.reach}) не может быть больше cumulative impressions (${cumImp}) на эту дату`
        );
      }
      let priorReach: number | null = null;
      for (const m of prior) {
        if (m.reachCumulative != null) priorReach = Number(m.reachCumulative);
      }
      if (priorReach != null && input.reach < priorReach) {
        throw new Error(
          `Reach является накопительным и не может уменьшаться (было ${priorReach})`
        );
      }
    }

    const data = {
      impressions: input.impressions ?? null,
      reachCumulative: input.reach ?? null,
      clicks: input.clicks ?? null,
      spend: input.spend ?? null,
      conversions: input.conversions ?? null,
      videoViews: input.video_views ?? null,
      date: dateObj,
    };

    const existingByDate = await prisma.dailyData.findUnique({
      where: { campaignId_date: { campaignId, date: dateObj } },
    });

    let row;
    if (options?.id) {
      const existing = await prisma.dailyData.findFirst({
        where: { id: options.id, campaignId },
      });
      if (!existing) throw new Error("Запись не найдена");
      if (existingByDate && existingByDate.id !== options.id) {
        throw new Error("Данные за эту дату уже внесены.");
      }
      row = await prisma.dailyData.update({
        where: { id: options.id },
        data,
      });
    } else if (existingByDate) {
      if (!options?.allowUpdate) {
        throw new Error("Данные за эту дату уже внесены.");
      }
      row = await prisma.dailyData.update({
        where: { id: existingByDate.id },
        data,
      });
    } else {
      row = await prisma.dailyData.create({
        data: { campaignId, ...data },
      });
    }

    await syncCampaignStatus(campaignId);
    const summary = await loadCampaignSummary(campaignId);
    if (!summary) throw new Error("Кампания не найдена");
    return { metric: mapDaily(row), summary };
  },

  async updateDaily(
    campaignId: string,
    metricId: string,
    userId: string,
    input: {
      date?: string;
      impressions?: number | null;
      reach?: number | null;
      clicks?: number | null;
      spend?: number | null;
      conversions?: number | null;
      video_views?: number | null;
    }
  ) {
    const owned = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!owned) throw new Error("Кампания не найдена");
    const existing = await prisma.dailyData.findFirst({
      where: { id: metricId, campaignId },
    });
    if (!existing) throw new Error("Запись не найдена");
    return this.upsertDaily(
      campaignId,
      userId,
      {
        date: input.date ?? existing.date.toISOString().slice(0, 10),
        impressions:
          input.impressions !== undefined
            ? input.impressions
            : decimalOrNull(existing.impressions),
        reach:
          input.reach !== undefined
            ? input.reach
            : decimalOrNull(existing.reachCumulative),
        clicks:
          input.clicks !== undefined ? input.clicks : decimalOrNull(existing.clicks),
        spend:
          input.spend !== undefined ? input.spend : decimalOrNull(existing.spend),
        conversions:
          input.conversions !== undefined
            ? input.conversions
            : decimalOrNull(existing.conversions),
        video_views:
          input.video_views !== undefined
            ? input.video_views
            : decimalOrNull(existing.videoViews),
      },
      { allowUpdate: true, id: metricId }
    );
  },

  async deleteDaily(campaignId: string, metricId: string, userId: string) {
    const owned = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!owned) throw new Error("Кампания не найдена");
    await prisma.dailyData.deleteMany({
      where: { id: metricId, campaignId },
    });
    await syncCampaignStatus(campaignId);
  },
};

function decimalOrNull(value: { toString(): string } | null): number | null {
  if (value == null) return null;
  return Number(value.toString());
}
