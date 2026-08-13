import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireAdminUser } from "@/lib/auth/current-user";
import { listAdminActivity } from "@/lib/admin/queries";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || "100");
    const rows = await listAdminActivity(limit);
    return jsonOk(rows);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}
