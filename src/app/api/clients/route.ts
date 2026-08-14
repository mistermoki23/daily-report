import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireSessionUser, requireWriteAccess } from "@/lib/auth/current-user";

export async function GET() {
  try {
    await requireSessionUser();
    const clients = await db.listClients();
    return jsonOk(clients);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireWriteAccess();
    const body = await readJson<{ name: string }>(request);
    const client = await db.createClient(body.name);
    return jsonOk(client, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка создания клиента");
  }
}
