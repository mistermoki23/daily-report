import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireAdminUser } from "@/lib/auth/current-user";
import { getAdminUserDetail } from "@/lib/admin/queries";

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
