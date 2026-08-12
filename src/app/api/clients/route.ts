import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";

export async function GET() {
  const clients = await db.listClients();
  return jsonOk(clients);
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{ name: string }>(request);
    const client = await db.createClient(body.name);
    return jsonOk(client, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Ошибка создания клиента");
  }
}
