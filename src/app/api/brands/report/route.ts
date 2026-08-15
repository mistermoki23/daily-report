import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireSessionUser } from "@/lib/auth/current-user";
import { getBrandReport, type BrandReportMode } from "@/lib/brands/report";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const brandId = searchParams.get("brandId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const mode = (searchParams.get("mode") ?? "daily") as BrandReportMode;

    if (!clientId || !startDate || !endDate) {
      return jsonError("Нужны clientId, startDate, endDate", 400);
    }

    const report = await getBrandReport({
      userId: user.id,
      role: user.role,
      clientId,
      brandId: brandId || undefined,
      startDate,
      endDate,
      mode,
    });
    return jsonOk(report);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка отчёта", 400);
  }
}
