import { db } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireSessionUser } from "@/lib/auth/current-user";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const summary = await db.getCampaign(id, user.id);
    if (!summary) return jsonError("Кампания не найдена", 404);
    return jsonOk(summary);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}
