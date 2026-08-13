import "server-only";

import type { ActivityAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma-client";

export async function logActivity(input: {
  userId: string;
  action: ActivityAction;
  reportId?: string | null;
}): Promise<void> {
  try {
    await prisma.reportActivity.create({
      data: {
        userId: input.userId,
        action: input.action,
        reportId: input.reportId ?? null,
      },
    });
  } catch (e) {
    // Never break auth/report flows because of logging failures
    console.error("[activity]", e instanceof Error ? e.message : e);
  }
}
