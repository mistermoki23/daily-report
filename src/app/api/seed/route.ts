import { db } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireAdminUser } from "@/lib/auth/current-user";

export async function POST() {
  try {
    await requireAdminUser();
    const store = await db.reset();
    const clients =
      "clients" in store && store.clients
        ? Array.isArray(store.clients)
          ? store.clients.length
          : (store.clients as { length: number }).length
        : 0;
    const campaigns =
      "campaigns" in store && store.campaigns
        ? Array.isArray(store.campaigns)
          ? store.campaigns.length
          : (store.campaigns as { length: number }).length
        : 0;
    return jsonOk({
      ok: true,
      clients,
      campaigns,
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка", 400);
  }
}
