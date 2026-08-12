import { db } from "@/lib/db";
import { jsonError, jsonOk, readJson } from "@/lib/api";

export async function GET() {
  const platforms = await db.listPlatforms();
  return jsonOk(platforms);
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{ name: string }>(request);
    const platform = await db.createPlatform(body.name);
    return jsonOk(platform, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Ошибка создания площадки");
  }
}
