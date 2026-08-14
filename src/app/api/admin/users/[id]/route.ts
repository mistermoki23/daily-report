import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireAdminUser } from "@/lib/auth/current-user";
import { getAdminUserDetail, updateUserRole } from "@/lib/admin/queries";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const user = await getAdminUserDetail(id);
    if (!user) return jsonError("Пользователь не найден", 404);
    return jsonOk(user);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const body = await readJson<{ role?: string }>(request);
    if (!body.role) return jsonError("role обязателен", 400);
    await updateUserRole(id, body.role);
    const user = await getAdminUserDetail(id);
    return jsonOk(user);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка", 400);
  }
}
