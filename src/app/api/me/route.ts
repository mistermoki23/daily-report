import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, getSessionUser } from "@/lib/auth/current-user";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonError("Требуется авторизация", 401);
    return jsonOk(user);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}
