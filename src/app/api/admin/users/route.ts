import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireAdminUser } from "@/lib/auth/current-user";
import { listAdminUsers } from "@/lib/admin/queries";

export async function GET() {
  try {
    await requireAdminUser();
    const users = await listAdminUsers();
    return jsonOk(users);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}
