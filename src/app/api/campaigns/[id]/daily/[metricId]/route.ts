import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireSessionUser } from "@/lib/auth/current-user";

type Params = { params: Promise<{ id: string; metricId: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
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
    const result = await db.updateDaily(id, metricId, user.id, body);
    return jsonOk(result);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка обновления");
  }
}

export const PATCH = PUT;

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id, metricId } = await params;
    await db.deleteDaily(id, metricId, user.id);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка удаления");
  }
}
