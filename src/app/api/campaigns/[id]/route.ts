import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireDeleteAccess, requireEditAccess, requireSessionUser } from "@/lib/auth/current-user";
import {
  softDeleteCampaign,
  updateCampaignFull,
} from "@/lib/campaigns/manage";
import type { CurrencyCode, KpiType } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const campaign = await db.getCampaign(id, user.id, user.role);
    if (!campaign) return jsonError("Кампания не найдена", 404);
    return jsonOk(campaign);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireEditAccess();
    const { id } = await params;
    const body = await readJson<{
      name?: string;
      client_id?: string;
      platform_id?: string;
      brand_id?: string | null;
      start_date?: string;
      end_date?: string;
      currency?: CurrencyCode;
      primary_kpi?: KpiType;
      kpis?: { kpi_type: KpiType; planned_value: number }[];
    }>(request);

    if (
      body.name == null ||
      body.client_id == null ||
      body.platform_id == null ||
      body.start_date == null ||
      body.end_date == null ||
      body.currency == null ||
      body.primary_kpi == null ||
      !Array.isArray(body.kpis)
    ) {
      return jsonError(
        "Передайте name, client_id, platform_id, start_date, end_date, currency, primary_kpi и kpis",
        400
      );
    }

    const campaign = await updateCampaignFull(id, user, {
      name: body.name,
      client_id: body.client_id,
      platform_id: body.platform_id,
      brand_id: body.brand_id,
      start_date: body.start_date,
      end_date: body.end_date,
      currency: body.currency,
      primary_kpi: body.primary_kpi,
      kpis: body.kpis,
    });
    return jsonOk(campaign);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка обновления", 400);
  }
}

export const PATCH = PUT;

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireDeleteAccess();
    const { id } = await params;
    await softDeleteCampaign(id, user);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка удаления", 400);
  }
}
