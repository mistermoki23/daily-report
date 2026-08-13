import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireAdminUser } from "@/lib/auth/current-user";
import { getAccessMatrix, updateUserAccess } from "@/lib/admin/queries";

export async function GET() {
  try {
    await requireAdminUser();
    const data = await getAccessMatrix();
    return jsonOk(data);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminUser();
    const body = await readJson<{ userId?: string; reportIds?: string[] }>(
      request
    );
    if (!body.userId) return jsonError("userId обязателен", 400);
    if (!Array.isArray(body.reportIds)) {
      return jsonError("reportIds должен быть массивом", 400);
    }
    await updateUserAccess(body.userId, body.reportIds);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка", 400);
  }
}
