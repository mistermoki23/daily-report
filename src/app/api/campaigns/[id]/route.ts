import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireSessionUser } from "@/lib/auth/current-user";
import type { CurrencyCode, KpiType } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const campaign = await db.getCampaign(id, user.id);
    if (!campaign) return jsonError("Кампания не найдена", 404);
    return jsonOk(campaign);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
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
    const campaign = await db.updateCampaign(id, user.id, body);
    return jsonOk(campaign);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка обновления");
  }
}

export const PATCH = PUT;

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    await db.deleteCampaign(id, user.id);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка удаления");
  }
}
