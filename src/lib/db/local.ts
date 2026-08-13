import "server-only";

import { promises as fs } from "fs";
import path from "path";
import type {
  Campaign,
  CampaignKpi,
  Client,
  CurrencyCode,
  DailyMetric,
  DataStore,
  KpiType,
  Platform,
} from "@/lib/types";
import { createSeedStore } from "@/lib/db/seed";
import { buildCampaignSummary } from "@/lib/calculations";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

let writeQueue: Promise<void> = Promise.resolve();

function assertLocalFsAllowed() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error(
      "Local JSON store (/data) is not available on Vercel. Use PostgreSQL via Prisma."
    );
  }
}

function migrateStore(raw: DataStore): DataStore {
  const defaultUserId = raw.users[0]?.id ?? "u-anna";
  return {
    ...raw,
    users: raw.users.map((u) => ({
      ...u,
      password_hash:
        (u as { password_hash?: string }).password_hash ??
        // demo1234
        "$2b$12$f/ecpHwyZl1aebWp1XJ9.OtewaqeBvEPUEA4ljjdCs9FoE9rYwNMS",
    })),
    campaigns: raw.campaigns.map((c) => ({
      ...c,
      user_id: c.user_id ?? defaultUserId,
      currency: (c.currency ?? "RUB") as CurrencyCode,
      primary_kpi: (c.primary_kpi ?? "impressions") as KpiType,
    })),
    daily_metrics: raw.daily_metrics.map((m) => ({
      ...m,
      reach: m.reach ?? null,
    })),
  };
}

async function ensureStore(): Promise<DataStore> {
  assertLocalFsAllowed();
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return migrateStore(JSON.parse(raw) as DataStore);
  } catch {
    const seed = createSeedStore();
    await fs.writeFile(STORE_PATH, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
}

async function saveStore(store: DataStore): Promise<void> {
  assertLocalFsAllowed();
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  });
  await writeQueue;
}

function hydrateCampaign(store: DataStore, campaign: Campaign) {
  const client = store.clients.find((c) => c.id === campaign.client_id)!;
  const platform = store.platforms.find((p) => p.id === campaign.platform_id)!;
  const kpis = store.campaign_kpis.filter((k) => k.campaign_id === campaign.id);
  const daily_metrics = store.daily_metrics
    .filter((m) => m.campaign_id === campaign.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    ...campaign,
    currency: campaign.currency ?? "RUB",
    primary_kpi: campaign.primary_kpi ?? "impressions",
    client,
    platform,
    kpis,
    daily_metrics,
  };
}

async function syncCampaignStatus(store: DataStore, campaignId: string) {
  const campaign = store.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return;
  const full = hydrateCampaign(store, campaign);
  const summary = buildCampaignSummary(full);
  campaign.status = summary.status;
  campaign.updated_at = new Date().toISOString();
}

export const localDb = {
  async reset() {
    const seed = createSeedStore();
    await saveStore(seed);
    return seed;
  },

  async getStore() {
    return ensureStore();
  },

  async findAuthUserByEmail(email: string) {
    const store = await ensureStore();
    const row = store.users.find((u) => u.email.toLowerCase() === email);
    if (!row?.password_hash) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      created_at: row.created_at,
      password_hash: row.password_hash,
    };
  },

  async createAuthUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    role?: string;
  }) {
    const store = await ensureStore();
    if (store.users.some((u) => u.email.toLowerCase() === input.email)) {
      throw new Error("Пользователь с таким email уже зарегистрирован");
    }
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      role: input.role ?? "USER",
      password_hash: input.passwordHash,
      created_at: now,
      updated_at: now,
    };
    store.users.push(row);
    await saveStore(store);
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      created_at: row.created_at,
    };
  },

  async listClients() {
    const store = await ensureStore();
    return [...store.clients].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  },

  async createClient(name: string): Promise<Client> {
    const store = await ensureStore();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Название клиента обязательно");
    if (store.clients.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("Клиент с таким названием уже существует");
    }
    const client: Client = {
      id: crypto.randomUUID(),
      name: trimmed,
      created_at: new Date().toISOString(),
    };
    store.clients.push(client);
    await saveStore(store);
    return client;
  },

  async listPlatforms() {
    const store = await ensureStore();
    return [...store.platforms].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  },

  async createPlatform(name: string): Promise<Platform> {
    const store = await ensureStore();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Название площадки обязательно");
    if (store.platforms.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("Площадка с таким названием уже существует");
    }
    const platform: Platform = {
      id: crypto.randomUUID(),
      name: trimmed,
      created_at: new Date().toISOString(),
    };
    store.platforms.push(platform);
    await saveStore(store);
    return platform;
  },

  async listCampaigns(userId: string) {
    const store = await ensureStore();
    return store.campaigns
      .filter((c) => c.user_id === userId)
      .map((c) => hydrateCampaign(store, c))
      .map((c) => buildCampaignSummary(c))
      .sort((a, b) => a.campaign.name.localeCompare(b.campaign.name, "ru"));
  },

  async getCampaign(id: string, userId: string) {
    const store = await ensureStore();
    const campaign = store.campaigns.find(
      (c) => c.id === id && c.user_id === userId
    );
    if (!campaign) return null;
    return buildCampaignSummary(hydrateCampaign(store, campaign));
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
    const store = await ensureStore();
    if (!input.name.trim()) throw new Error("Название кампании обязательно");
    if (input.end_date < input.start_date) {
      throw new Error("Дата окончания не может быть раньше даты начала");
    }
    if (!store.users.some((u) => u.id === input.user_id)) {
      throw new Error("Пользователь не найден");
    }
    if (!store.clients.some((c) => c.id === input.client_id)) {
      throw new Error("Клиент не найден");
    }
    if (!store.platforms.some((p) => p.id === input.platform_id)) {
      throw new Error("Площадка не найдена");
    }
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

    const now = new Date().toISOString();
    const campaign: Campaign = {
      id: crypto.randomUUID(),
      user_id: input.user_id,
      client_id: input.client_id,
      platform_id: input.platform_id,
      name: input.name.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      currency: input.currency || "RUB",
      primary_kpi: input.primary_kpi,
      status: "attention",
      created_at: now,
      updated_at: now,
    };
    store.campaigns.push(campaign);
    for (const kpi of activeKpis) {
      const row: CampaignKpi = {
        id: crypto.randomUUID(),
        campaign_id: campaign.id,
        kpi_type: kpi.kpi_type,
        planned_value: kpi.planned_value,
        created_at: now,
      };
      store.campaign_kpis.push(row);
    }
    await syncCampaignStatus(store, campaign.id);
    await saveStore(store);
    return buildCampaignSummary(hydrateCampaign(store, campaign));
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
    const store = await ensureStore();
    const campaign = store.campaigns.find(
      (c) => c.id === id && c.user_id === userId
    );
    if (!campaign) throw new Error("Кампания не найдена");

    if (input.name !== undefined) campaign.name = input.name.trim();
    if (input.client_id) campaign.client_id = input.client_id;
    if (input.platform_id) campaign.platform_id = input.platform_id;
    if (input.start_date) campaign.start_date = input.start_date;
    if (input.end_date) campaign.end_date = input.end_date;
    if (input.currency) campaign.currency = input.currency;
    if (input.primary_kpi) campaign.primary_kpi = input.primary_kpi;
    if (campaign.end_date < campaign.start_date) {
      throw new Error("Дата окончания не может быть раньше даты начала");
    }

    if (input.kpis) {
      store.campaign_kpis = store.campaign_kpis.filter((k) => k.campaign_id !== id);
      const now = new Date().toISOString();
      for (const kpi of input.kpis.filter((k) => k.planned_value > 0)) {
        if (kpi.planned_value < 0) {
          throw new Error("Плановые значения не могут быть отрицательными");
        }
        store.campaign_kpis.push({
          id: crypto.randomUUID(),
          campaign_id: id,
          kpi_type: kpi.kpi_type,
          planned_value: kpi.planned_value,
          created_at: now,
        });
      }
    }

    await syncCampaignStatus(store, id);
    await saveStore(store);
    return buildCampaignSummary(hydrateCampaign(store, campaign));
  },

  async deleteCampaign(id: string, userId: string) {
    const store = await ensureStore();
    const campaign = store.campaigns.find(
      (c) => c.id === id && c.user_id === userId
    );
    if (!campaign) throw new Error("Кампания не найдена");
    store.campaigns = store.campaigns.filter((c) => c.id !== id);
    store.campaign_kpis = store.campaign_kpis.filter((k) => k.campaign_id !== id);
    store.daily_metrics = store.daily_metrics.filter((m) => m.campaign_id !== id);
    await saveStore(store);
  },

  async listDaily(campaignId: string, userId: string) {
    const store = await ensureStore();
    const campaign = store.campaigns.find(
      (c) => c.id === campaignId && c.user_id === userId
    );
    if (!campaign) throw new Error("Кампания не найдена");
    return store.daily_metrics
      .filter((m) => m.campaign_id === campaignId)
      .sort((a, b) => a.date.localeCompare(b.date));
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
    const store = await ensureStore();
    const campaign = store.campaigns.find(
      (c) => c.id === campaignId && c.user_id === userId
    );
    if (!campaign) throw new Error("Кампания не найдена");

    const date = input.date.slice(0, 10);
    if (date < campaign.start_date) {
      throw new Error("Дата не может быть раньше начала кампании");
    }
    if (date > campaign.end_date) {
      throw new Error("Дата не может быть позже конца кампании");
    }

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

    // Reach is cumulative: validate against impressions to date and prior reach
    if (input.reach != null) {
      const prior = store.daily_metrics
        .filter(
          (m) =>
            m.campaign_id === campaignId &&
            m.date.slice(0, 10) < date &&
            (!options?.id || m.id !== options.id)
        )
        .sort((a, b) => a.date.localeCompare(b.date));

      const priorImp = prior.reduce((s, m) => s + (m.impressions ?? 0), 0);
      const dayImp = input.impressions ?? 0;
      const cumImp = priorImp + dayImp;

      if (input.reach > cumImp && cumImp > 0) {
        throw new Error(
          `Reach (${input.reach}) не может быть больше cumulative impressions (${cumImp}) на эту дату`
        );
      }

      let priorReach: number | null = null;
      for (const m of prior) {
        if (m.reach != null) priorReach = m.reach;
      }
      if (priorReach != null && input.reach < priorReach) {
        throw new Error(
          `Reach является накопительным и не может уменьшаться (было ${priorReach})`
        );
      }
    }

    const existing = store.daily_metrics.find(
      (m) =>
        m.campaign_id === campaignId &&
        m.date === date &&
        (!options?.id || m.id === options.id)
    );
    const duplicate = store.daily_metrics.find(
      (m) =>
        m.campaign_id === campaignId &&
        m.date === date &&
        (!options?.id || m.id !== options.id)
    );

    if (duplicate && !options?.allowUpdate && !options?.id) {
      throw new Error("Данные за эту дату уже внесены.");
    }
    if (duplicate && options?.id && duplicate.id !== options.id) {
      throw new Error("Данные за эту дату уже внесены.");
    }

    const now = new Date().toISOString();
    let row: DailyMetric;

    if (existing && (options?.allowUpdate || options?.id)) {
      row = existing;
      row.impressions = input.impressions ?? null;
      row.reach = input.reach ?? null;
      row.clicks = input.clicks ?? null;
      row.spend = input.spend ?? null;
      row.conversions = input.conversions ?? null;
      row.video_views = input.video_views ?? null;
      row.date = date;
      row.updated_at = now;
    } else if (existing) {
      throw new Error("Данные за эту дату уже внесены.");
    } else {
      row = {
        id: crypto.randomUUID(),
        campaign_id: campaignId,
        date,
        impressions: input.impressions ?? null,
        reach: input.reach ?? null,
        clicks: input.clicks ?? null,
        spend: input.spend ?? null,
        conversions: input.conversions ?? null,
        video_views: input.video_views ?? null,
        created_at: now,
        updated_at: now,
      };
      store.daily_metrics.push(row);
    }

    await syncCampaignStatus(store, campaignId);
    await saveStore(store);
    return {
      metric: row,
      summary: buildCampaignSummary(hydrateCampaign(store, campaign)),
    };
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
    const store = await ensureStore();
    const campaign = store.campaigns.find(
      (c) => c.id === campaignId && c.user_id === userId
    );
    if (!campaign) throw new Error("Кампания не найдена");
    const existing = store.daily_metrics.find(
      (m) => m.id === metricId && m.campaign_id === campaignId
    );
    if (!existing) throw new Error("Запись не найдена");
    return this.upsertDaily(
      campaignId,
      userId,
      {
        date: input.date ?? existing.date,
        impressions:
          input.impressions !== undefined ? input.impressions : existing.impressions,
        reach: input.reach !== undefined ? input.reach : existing.reach,
        clicks: input.clicks !== undefined ? input.clicks : existing.clicks,
        spend: input.spend !== undefined ? input.spend : existing.spend,
        conversions:
          input.conversions !== undefined ? input.conversions : existing.conversions,
        video_views:
          input.video_views !== undefined ? input.video_views : existing.video_views,
      },
      { allowUpdate: true, id: metricId }
    );
  },

  async deleteDaily(campaignId: string, metricId: string, userId: string) {
    const store = await ensureStore();
    const campaign = store.campaigns.find(
      (c) => c.id === campaignId && c.user_id === userId
    );
    if (!campaign) throw new Error("Кампания не найдена");
    store.daily_metrics = store.daily_metrics.filter(
      (m) => !(m.id === metricId && m.campaign_id === campaignId)
    );
    await syncCampaignStatus(store, campaignId);
    await saveStore(store);
  },
};
