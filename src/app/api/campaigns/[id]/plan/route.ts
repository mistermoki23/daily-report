import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireEditAccess } from "@/lib/auth/current-user";
import {
  EDITABLE_PLAN_KPIS,
  updateCampaignPlan,
  type EditablePlanKpi,
} from "@/lib/campaigns/update-plan";
import { KPI_LABELS } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function parsePlanValue(
  raw: unknown,
  field: EditablePlanKpi
): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`Некорректное значение для ${KPI_LABELS[field]}`);
  }
  if (n < 0) {
    throw new Error("Плановые значения не могут быть отрицательными");
  }
  return n;
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireEditAccess();
    const { id } = await params;
    const body = await readJson<Record<string, unknown>>(request);

    const input: Partial<Record<EditablePlanKpi, number | null>> = {};
    let provided = 0;
    for (const field of EDITABLE_PLAN_KPIS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        input[field] = parsePlanValue(body[field], field);
        provided += 1;
      }
    }
    if (provided === 0) {
      return jsonError("Передайте хотя бы одно плановое значение", 400);
    }

    const summary = await updateCampaignPlan(id, user, input);
    return jsonOk(summary);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка сохранения плана", 400);
  }
}
