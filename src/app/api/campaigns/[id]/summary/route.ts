import { db } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** Campaign summary: PLAN / FACT / remaining / pacing / calculated Plan vs Fact */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const summary = await db.getCampaign(id);
  if (!summary) return jsonError("Кампания не найдена", 404);
  return jsonOk(summary);
}
