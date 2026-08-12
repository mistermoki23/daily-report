import { getDashboardData } from "@/lib/dashboard";
import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireSessionUser } from "@/lib/auth/current-user";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const data = await getDashboardData(user.id, {
      clientId: searchParams.get("clientId") ?? undefined,
      platformId: searchParams.get("platformId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      month: searchParams.get("month") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      currency: searchParams.get("currency") ?? undefined,
    });
    return jsonOk(data);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}
