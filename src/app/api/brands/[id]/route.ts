import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireWriteAccess } from "@/lib/auth/current-user";
import { deleteBrand, renameBrand } from "@/lib/brands/manage";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireWriteAccess();
    const { id } = await params;
    const body = await readJson<{ name: string }>(request);
    const brand = await renameBrand(id, body.name ?? "");
    return jsonOk(brand);
  } catch (e) {
    console.error("[PATCH /api/brands/:id]", e);
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(
      e instanceof Error ? e.message : "Ошибка переименования",
      400
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireWriteAccess();
    const { id } = await params;
    await deleteBrand(id);
    return jsonOk({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/brands/:id]", e);
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(
      e instanceof Error ? e.message : "Ошибка удаления",
      400
    );
  }
}
