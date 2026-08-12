import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getDashboardData } from "@/lib/dashboard";
import type { CurrencyCode, KpiType } from "@/lib/types";

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
  return jsonOk(data.campaigns);
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      client_id: string;
      platform_id: string;
      name: string;
      start_date: string;
      end_date: string;
      currency: CurrencyCode;
      primary_kpi: KpiType;
      kpis: { kpi_type: KpiType; planned_value: number }[];
    }>(request);
    const campaign = await db.createCampaign(body);
    return jsonOk(campaign, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Ошибка создания кампании");
  }
}
