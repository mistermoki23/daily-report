import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireAdminUser } from "@/lib/auth/current-user";
import { listPlanChangeHistory } from "@/lib/campaigns/update-plan";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || "200");
    const rows = await listPlanChangeHistory(limit);
    return jsonOk(rows);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}
