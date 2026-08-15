import { jsonError, jsonOk } from "@/lib/api";
import { AuthError, requireSessionUser } from "@/lib/auth/current-user";
import { getClientWithBrands } from "@/lib/brands/manage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSessionUser();
    const { id } = await params;
    const client = await getClientWithBrands(id);
    if (!client) return jsonError("Клиент не найден", 404);
    return jsonOk(client);
  } catch (e) {
    console.error("[GET /api/clients/:id]", e);
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(
      e instanceof Error ? e.message : "Ошибка загрузки клиента",
      500
    );
  }
}
