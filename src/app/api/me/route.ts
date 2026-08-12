import { db } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET() {
  const user = await db.getUser();
  return jsonOk(user);
}
