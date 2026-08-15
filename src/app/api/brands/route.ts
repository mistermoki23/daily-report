import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireSessionUser, requireWriteAccess } from "@/lib/auth/current-user";
import {
  createBrand,
  listBrands,
  listBrandsWithCampaignCounts,
} from "@/lib/brands/manage";

export async function GET(request: Request) {
  try {
    await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const withCounts = searchParams.get("withCounts") === "1";

    if (withCounts) {
      if (!clientId) {
        return jsonError("clientId обязателен для withCounts", 400);
      }
      const brands = await listBrandsWithCampaignCounts(clientId);
      return jsonOk(brands);
    }

    const brands = await listBrands(clientId);
    return jsonOk(brands);
  } catch (e) {
    console.error("[GET /api/brands]", e);
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(
      e instanceof Error ? e.message : "Ошибка загрузки брендов",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireWriteAccess();
    const body = await readJson<{
      clientId?: string;
      client_id?: string;
      name: string;
    }>(request);
    const clientId = body.clientId ?? body.client_id;
    if (!clientId) return jsonError("clientId обязателен", 400);
    const brand = await createBrand(clientId, body.name ?? "");
    return jsonOk(brand, { status: 201 });
  } catch (e) {
    console.error("[POST /api/brands]", e);
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(
      e instanceof Error ? e.message : "Ошибка создания бренда",
      400
    );
  }
}
