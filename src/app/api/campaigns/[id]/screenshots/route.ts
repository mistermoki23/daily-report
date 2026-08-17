import { AuthError, requireSessionUser } from "@/lib/auth/current-user";
import { canEdit } from "@/lib/auth/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import {
  deleteCampaignScreenshot,
  listCampaignScreenshots,
  upsertCampaignScreenshot,
} from "@/lib/campaigns/screenshots";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const screenshots = await listCampaignScreenshots(user, id);
    return jsonOk({ screenshots });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка", 400);
  }
}

async function handleUpload(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    if (!canEdit(user.role)) {
      return jsonError("Недостаточно прав для загрузки скриншотов", 403);
    }
    const { id } = await params;
    const form = await request.formData();
    const type = String(form.get("type") ?? "");
    const fileValue = form.get("file");
    if (!(fileValue instanceof File)) {
      return jsonError("Передайте файл в поле file", 400);
    }
    const screenshot = await upsertCampaignScreenshot(user, id, type, fileValue);
    return jsonOk({ screenshot });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка загрузки", 400);
  }
}

export async function POST(request: Request, ctx: Params) {
  return handleUpload(request, ctx);
}

export async function PUT(request: Request, ctx: Params) {
  return handleUpload(request, ctx);
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    if (!canEdit(user.role)) {
      return jsonError("Недостаточно прав для удаления скриншотов", 403);
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "";
    await deleteCampaignScreenshot(user, id, type);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка удаления", 400);
  }
}
