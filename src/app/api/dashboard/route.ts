import { getDashboardData } from "@/lib/dashboard";
import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireSessionUser } from "@/lib/auth/current-user";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    // Empty query params must stay undefined — never treat "" as a brand filter.
    const clientId = searchParams.get("clientId") || undefined;
    const brandId = searchParams.get("brandId") || undefined;
    const platformId = searchParams.get("platformId") || undefined;
    const status = searchParams.get("status") || undefined;
    const month = searchParams.get("month") || undefined;
    const search = searchParams.get("search") || undefined;
    const currency = searchParams.get("currency") || undefined;

    const data = await getDashboardData(
      user.id,
      { clientId, brandId, platformId, status, month, search, currency },
      user.role
    );
    return jsonOk(data);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    console.error("[/api/dashboard]", e);
    return jsonError(
      e instanceof Error ? e.message : "Ошибка",
      500
    );
  }
}
