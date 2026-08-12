import { db } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function POST() {
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
}
