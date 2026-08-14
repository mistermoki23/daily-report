import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { AuthError, requireSessionUser, requireWriteAccess } from "@/lib/auth/current-user";

export async function GET() {
  try {
    await requireSessionUser();
    const platforms = await db.listPlatforms();
    return jsonOk(platforms);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError("Ошибка", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireWriteAccess();
    const body = await readJson<{ name: string }>(request);
    const platform = await db.createPlatform(body.name);
    return jsonOk(platform, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError(e instanceof Error ? e.message : "Ошибка создания площадки");
  }
}
