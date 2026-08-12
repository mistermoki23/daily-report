import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireSessionUser } from "@/lib/auth/current-user";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const metrics = await db.listDaily(id, user.id);
    return jsonOk(metrics);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка", 400);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const body = await readJson<{
      date: string;
      impressions?: number | null;
      reach?: number | null;
      clicks?: number | null;
      spend?: number | null;
      conversions?: number | null;
      video_views?: number | null;
    }>(request);
    const result = await db.upsertDaily(id, user.id, body);
    return jsonOk(result, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка сохранения");
  }
}
