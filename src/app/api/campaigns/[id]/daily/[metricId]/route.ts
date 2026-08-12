import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";

type Params = { params: Promise<{ id: string; metricId: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id, metricId } = await params;
    const body = await readJson<{
      date?: string;
      impressions?: number | null;
      reach?: number | null;
      clicks?: number | null;
      spend?: number | null;
      conversions?: number | null;
      video_views?: number | null;
    }>(request);
    const result = await db.updateDaily(id, metricId, body);
    return jsonOk(result);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Ошибка обновления");
  }
}

/** Alias for PUT — PATCH /api/campaigns/[id]/daily/[dailyId] */
export const PATCH = PUT;

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id, metricId } = await params;
    await db.deleteDaily(id, metricId);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Ошибка удаления");
  }
}
