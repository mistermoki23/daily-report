import { jsonError, readJson } from "@/lib/api";
import { AuthError, requireSessionUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { buildCampaignExportModel } from "@/lib/campaigns/export-model";
import { buildCampaignWorkbook } from "@/lib/campaigns/export-workbook";
import { KPI_TYPES, type KpiType } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function asciiFilename(name: string): string {
  return name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const body = await readJson<{
      start_date?: string;
      end_date?: string;
      kpis?: KpiType[];
    }>(request);

    const summary = await db.getCampaign(id, user.id, user.role);
    if (!summary) return jsonError("Кампания не найдена", 404);

    const requested = Array.isArray(body.kpis)
      ? body.kpis.filter((k): k is KpiType => KPI_TYPES.includes(k as KpiType))
      : summary.campaign.kpis.map((k) => k.kpi_type);

    const model = buildCampaignExportModel(summary, {
      startDate: body.start_date || summary.campaign.start_date,
      endDate: body.end_date || summary.campaign.end_date,
      kpis: requested,
    });
    const buffer = buildCampaignWorkbook(model);
    const filename = model.filename;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${asciiFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка экспорта", 400);
  }
}
