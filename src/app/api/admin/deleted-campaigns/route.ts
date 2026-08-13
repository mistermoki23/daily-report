import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireAdminUser } from "@/lib/auth/current-user";
import { listDeletedCampaigns } from "@/lib/campaigns/manage";

export async function GET() {
  try {
    await requireAdminUser();
    const campaigns = await listDeletedCampaigns();
    return jsonOk({ campaigns });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}
