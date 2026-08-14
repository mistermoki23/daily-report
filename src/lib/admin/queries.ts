import "server-only";

import { differenceInCalendarDays, subDays } from "date-fns";
import { prisma } from "@/lib/db/prisma-client";
import {
  isAssignableRole,
  isUserActive,
  splitDisplayName,
} from "@/lib/auth/roles";
import { setUserReportAccess } from "@/lib/auth/report-access";
import { UserRole as PrismaUserRole } from "@prisma/client";

function fillProgress(start: Date, end: Date, filledDays: number): number {
  const total = Math.max(1, differenceInCalendarDays(end, start) + 1);
  return Math.min(100, Math.round((filledDays / total) * 100));
}

export async function getAdminDashboardStats() {
  const weekAgo = subDays(new Date(), 7);
  const monthAgo = subDays(new Date(), 30);

  const [
    usersCount,
    newRegistrations,
    activeUsers,
    reportsCount,
    reportsInProgress,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: monthAgo } } }),
    prisma.campaign.count({ where: { deletedAt: null } }),
    prisma.campaign.count({
      where: { deletedAt: null, status: { not: "completed" } },
    }),
  ]);

  return {
    usersCount,
    newRegistrations,
    activeUsers,
    reportsCount,
    reportsInProgress,
  };
}

export async function listAdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { reportAccess: true } },
    },
  });

  return users.map((u) => {
    const { firstName, lastName } = splitDisplayName(u.name);
    return {
      id: u.id,
      firstName,
      lastName,
      email: u.email,
      role: u.role,
      registeredAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      reportsAvailable: u._count.reportAccess,
      active: isUserActive(u.lastLoginAt),
    };
  });
}

export async function getAdminUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      reportAccess: {
        include: {
          report: {
            include: {
              _count: { select: { dailyData: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        where: {
          action: {
            in: [
              "REPORT_OPENED",
              "REPORT_STARTED",
              "REPORT_UPDATED",
              "REPORT_COMPLETED",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      },
    },
  });
  if (!user) return null;

  const { firstName, lastName } = splitDisplayName(user.name);

  const openedIds = new Set(
    user.activities
      .filter((a) => a.action === "REPORT_OPENED" && a.reportId)
      .map((a) => a.reportId as string)
  );
  const startedIds = new Set(
    user.activities
      .filter((a) => a.action === "REPORT_STARTED" && a.reportId)
      .map((a) => a.reportId as string)
  );

  const availableReports = user.reportAccess
    .filter((a) => a.report.deletedAt == null)
    .map((a) => {
    const r = a.report;
    const progress = fillProgress(r.startDate, r.endDate, r._count.dailyData);
    const lastChange =
      user.activities.find((act) => act.reportId === r.id)?.createdAt ??
      r.updatedAt;
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      progress,
      lastChangedAt: lastChange.toISOString(),
      opened: openedIds.has(r.id),
      started: startedIds.has(r.id) || r._count.dailyData > 0,
    };
  });

  return {
    id: user.id,
    firstName,
    lastName,
    email: user.email,
    role: user.role,
    registeredAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    active: isUserActive(user.lastLoginAt),
    availableReports,
    openedReports: availableReports.filter((r) => r.opened),
    startedReports: availableReports.filter((r) => r.started),
  };
}

export async function listAdminReports() {
  const reports = await prisma.campaign.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { accesses: true, dailyData: true } },
    },
  });

  const started = await prisma.reportActivity.groupBy({
    by: ["reportId"],
    where: {
      action: "REPORT_STARTED",
      reportId: { not: null },
    },
    _count: { _all: true },
  });
  const startedMap = new Map(
    started.map((s) => [s.reportId as string, s._count._all])
  );

  return reports.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    accessCount: r._count.accesses,
    startedCount: startedMap.get(r.id) ?? (r._count.dailyData > 0 ? 1 : 0),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getAccessMatrix() {
  const [users, reports, accesses] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.campaign.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
    prisma.reportAccess.findMany({
      select: { userId: true, reportId: true },
    }),
  ]);

  const accessSet = new Set(accesses.map((a) => `${a.userId}:${a.reportId}`));

  return {
    users: users.map((u) => {
      const { firstName, lastName } = splitDisplayName(u.name);
      return {
        id: u.id,
        name: u.name,
        firstName,
        lastName,
        email: u.email,
        role: u.role,
        reportIds: reports
          .filter((r) => accessSet.has(`${u.id}:${r.id}`))
          .map((r) => r.id),
      };
    }),
    reports,
  };
}

export async function updateUserAccess(userId: string, reportIds: string[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Пользователь не найден");
  if (user.role === "ADMIN") {
    throw new Error("Назначение доступов администратору не требуется");
  }
  if (reportIds.length > 0) {
    const found = await prisma.campaign.count({
      where: { id: { in: reportIds } },
    });
    if (found !== reportIds.length) {
      throw new Error("Один или несколько отчётов не найдены");
    }
  }
  await setUserReportAccess(userId, reportIds);
  return { ok: true };
}

function toPrismaAssignableRole(role: string): PrismaUserRole {
  if (role === "ADMIN") return PrismaUserRole.ADMIN;
  if (role === "MANAGER") return PrismaUserRole.MANAGER;
  if (role === "READER") return PrismaUserRole.READER;
  throw new Error("Некорректная роль. Допустимы: ADMIN, MANAGER, READER");
}

export async function updateUserRole(userId: string, role: string) {
  if (!isAssignableRole(role)) {
    throw new Error("Некорректная роль. Допустимы: ADMIN, MANAGER, READER");
  }
  const prismaRole = toPrismaAssignableRole(role);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Пользователь не найден");

  if (user.role === "ADMIN" && role !== "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      throw new Error("Нельзя снять роль у единственного администратора");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: prismaRole },
  });
  return { ok: true };
}

export async function listAdminActivity(limit = 100) {
  const rows = await prisma.reportActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, limit)),
    include: {
      user: { select: { id: true, name: true, email: true } },
      report: { select: { id: true, name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    createdAt: r.createdAt.toISOString(),
    user: r.user,
    report: r.report,
  }));
}
