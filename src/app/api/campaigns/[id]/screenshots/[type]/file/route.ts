import { AuthError, requireSessionUser } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/api";
import { getCampaignScreenshotFile } from "@/lib/campaigns/screenshots";

export const runtime = "nodejs";
export const maxDuration = 30;

type Params = { params: Promise<{ id: string; type: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id, type } = await params;
    const file = await getCampaignScreenshotFile(user, id, type);
    const headers = new Headers({
      "Content-Type": file.mimeType,
      "Content-Length": String(file.buffer.length),
      "Cache-Control": "private, no-store",
    });
    if (file.originalName) {
      headers.set(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(file.originalName)}"`
      );
    }
    return new Response(new Uint8Array(file.buffer), { status: 200, headers });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка", 400);
  }
}
