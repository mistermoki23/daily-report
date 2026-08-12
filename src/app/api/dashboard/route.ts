import { getDashboardData } from "@/lib/dashboard";
import { jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = await getDashboardData({
    clientId: searchParams.get("clientId") ?? undefined,
    platformId: searchParams.get("platformId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    month: searchParams.get("month") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    currency: searchParams.get("currency") ?? undefined,
  });
  return jsonOk(data);
}
