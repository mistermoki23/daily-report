import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import type { CurrencyCode, KpiType } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const campaign = await db.getCampaign(id);
  if (!campaign) return jsonError("Кампания не найдена", 404);
  return jsonOk(campaign);
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson<{
      name?: string;
      client_id?: string;
      platform_id?: string;
      start_date?: string;
      end_date?: string;
      currency?: CurrencyCode;
      primary_kpi?: KpiType;
      kpis?: { kpi_type: KpiType; planned_value: number }[];
    }>(request);
    const campaign = await db.updateCampaign(id, body);
    return jsonOk(campaign);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Ошибка обновления");
  }
}

/** Alias for PUT — PATCH /api/campaigns/[id] */
export const PATCH = PUT;

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await db.deleteCampaign(id);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Ошибка удаления");
  }
}
