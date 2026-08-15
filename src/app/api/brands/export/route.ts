import { jsonError, readJson } from "@/lib/api";
import { AuthError, requireSessionUser } from "@/lib/auth/current-user";
import {
  brandExportFilename,
  buildBrandWorkbook,
} from "@/lib/brands/export-workbook";
import { getBrandReport, type BrandReportMode } from "@/lib/brands/report";

function asciiFilename(name: string): string {
  return name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await readJson<{
      clientId: string;
      brandId?: string | null;
      startDate: string;
      endDate: string;
      mode?: BrandReportMode;
    }>(request);

    if (!body.clientId || !body.startDate || !body.endDate) {
      return jsonError("Нужны clientId, startDate, endDate", 400);
    }

    const report = await getBrandReport({
      userId: user.id,
      role: user.role,
      clientId: body.clientId,
      brandId: body.brandId || undefined,
      startDate: body.startDate,
      endDate: body.endDate,
      mode: body.mode === "weekly" ? "weekly" : "daily",
    });

    const buffer = buildBrandWorkbook(report);
    const filename = brandExportFilename(report);

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
