import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireAdminUser } from "@/lib/auth/current-user";
import { listAdminReports } from "@/lib/admin/queries";

export async function GET() {
  try {
    await requireAdminUser();
    const reports = await listAdminReports();
    return jsonOk(reports);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}
