import "server-only";

import { prisma } from "@/lib/db/prisma-client";
import { isAdminRole } from "@/lib/auth/roles";

/** Server-side report (campaign) access check via ReportAccess. */
export async function userHasReportAccess(
  userId: string,
  reportId: string
): Promise<boolean> {
  const row = await prisma.reportAccess.findUnique({
    where: {
      userId_reportId: { userId, reportId },
    },
    select: { id: true },
  });
  return !!row;
}

export async function assertReportAccess(
  userId: string,
  reportId: string,
  role?: string
): Promise<void> {
  if (isAdminRole(role)) return;
  const ok = await userHasReportAccess(userId, reportId);
  if (!ok) throw new Error("Кампания не найдена");
}

export async function grantReportAccess(userId: string, reportId: string) {
  await prisma.reportAccess.upsert({
    where: { userId_reportId: { userId, reportId } },
    create: { userId, reportId },
    update: {},
  });
}

export async function revokeReportAccess(userId: string, reportId: string) {
  await prisma.reportAccess.deleteMany({
    where: { userId, reportId },
  });
}

export async function setUserReportAccess(
  userId: string,
  reportIds: string[]
): Promise<void> {
  const unique = [...new Set(reportIds)];
  await prisma.$transaction(async (tx) => {
    await tx.reportAccess.deleteMany({ where: { userId } });
    if (unique.length === 0) return;
    await tx.reportAccess.createMany({
      data: unique.map((reportId) => ({ userId, reportId })),
      skipDuplicates: true,
    });
  });
}
