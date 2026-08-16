import "server-only";

import type { CampaignScreenshotType } from "@prisma/client";
import { AuthError } from "@/lib/auth/current-user";
import { canEdit } from "@/lib/auth/permissions";
import { canAccessCampaign } from "@/lib/campaigns/manage";
import { prisma } from "@/lib/db/prisma-client";
import {
  deleteCampaignScreenshotFile,
  detectImageMime,
  isAllowedScreenshotMime,
  MAX_SCREENSHOT_BYTES,
  publicScreenshotUrl,
  readCampaignScreenshotFile,
  writeCampaignScreenshotFile,
} from "@/lib/storage/campaign-screenshots";
import type { CampaignSummary, User } from "@/lib/types";

export const SCREENSHOT_TYPES = ["LAUNCH", "REPORTING"] as const;
export type ScreenshotType = (typeof SCREENSHOT_TYPES)[number];

export type CampaignScreenshotDto = {
  id: string;
  campaign_id: string;
  type: ScreenshotType;
  url: string;
  original_name: string | null;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

export type CampaignScreenshotStatus = {
  launch: boolean;
  reporting: boolean;
};

function isScreenshotType(value: string): value is ScreenshotType {
  return (SCREENSHOT_TYPES as readonly string[]).includes(value);
}

function parseType(value: string | null | undefined): ScreenshotType {
  const raw = (value ?? "").trim().toUpperCase();
  if (!isScreenshotType(raw)) {
    throw new Error("type должен быть LAUNCH или REPORTING");
  }
  return raw;
}

function mapScreenshot(row: {
  id: string;
  campaignId: string;
  type: CampaignScreenshotType;
  url: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): CampaignScreenshotDto {
  return {
    id: row.id,
    campaign_id: row.campaignId,
    type: row.type as ScreenshotType,
    url: row.url,
    original_name: row.originalName,
    mime_type: row.mimeType,
    size_bytes: row.sizeBytes,
    uploaded_by: row.uploadedBy,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

async function assertCanView(user: User, campaignId: string) {
  const ok = await canAccessCampaign(user.id, campaignId, user.role);
  if (!ok) throw new AuthError("Кампания не найдена", 404);
}

async function assertCanManage(user: User, campaignId: string) {
  if (!canEdit(user.role)) {
    throw new AuthError("Недостаточно прав для загрузки скриншотов", 403);
  }
  await assertCanView(user, campaignId);
}

export async function listCampaignScreenshots(
  user: User,
  campaignId: string
): Promise<CampaignScreenshotDto[]> {
  await assertCanView(user, campaignId);
  const rows = await prisma.campaignScreenshot.findMany({
    where: { campaignId },
    orderBy: { type: "asc" },
  });
  return rows.map(mapScreenshot);
}

export async function getCampaignScreenshotFile(
  user: User,
  campaignId: string,
  typeRaw: string
): Promise<{ buffer: Buffer; mimeType: string; originalName: string | null }> {
  await assertCanView(user, campaignId);
  const type = parseType(typeRaw);
  const row = await prisma.campaignScreenshot.findUnique({
    where: { campaignId_type: { campaignId, type } },
  });
  if (!row) throw new AuthError("Скриншот не найден", 404);
  const buffer = await readCampaignScreenshotFile(row.storageKey);
  return {
    buffer,
    mimeType: row.mimeType,
    originalName: row.originalName,
  };
}

export async function upsertCampaignScreenshot(
  user: User,
  campaignId: string,
  typeRaw: string,
  file: File
): Promise<CampaignScreenshotDto> {
  await assertCanManage(user, campaignId);
  const type = parseType(typeRaw);

  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Файл не передан");
  }
  if (file.size <= 0) throw new Error("Пустой файл");
  if (file.size > MAX_SCREENSHOT_BYTES) {
    throw new Error("Размер файла не должен превышать 10 MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = detectImageMime(buffer);
  const declared = (file.type || "").toLowerCase();
  const mime = sniffed ?? (isAllowedScreenshotMime(declared) ? declared : null);
  if (!mime) {
    throw new Error("Допустимы только PNG, JPG/JPEG и WebP");
  }
  if (declared && isAllowedScreenshotMime(declared) && declared !== mime) {
    throw new Error("Тип файла не совпадает с содержимым");
  }

  const existing = await prisma.campaignScreenshot.findUnique({
    where: { campaignId_type: { campaignId, type } },
  });

  const written = await writeCampaignScreenshotFile({
    campaignId,
    type,
    buffer,
    mime,
  });
  const url = publicScreenshotUrl(campaignId, type);

  try {
    const row = await prisma.campaignScreenshot.upsert({
      where: { campaignId_type: { campaignId, type } },
      create: {
        campaignId,
        type,
        url,
        storageKey: written.storageKey,
        originalName: file.name || null,
        mimeType: mime,
        sizeBytes: written.sizeBytes,
        uploadedBy: user.id,
      },
      update: {
        url,
        storageKey: written.storageKey,
        originalName: file.name || null,
        mimeType: mime,
        sizeBytes: written.sizeBytes,
        uploadedBy: user.id,
      },
    });

    if (existing?.storageKey && existing.storageKey !== written.storageKey) {
      await deleteCampaignScreenshotFile(existing.storageKey);
    }

    return mapScreenshot(row);
  } catch (error) {
    await deleteCampaignScreenshotFile(written.storageKey);
    throw error;
  }
}

export async function deleteCampaignScreenshot(
  user: User,
  campaignId: string,
  typeRaw: string
): Promise<void> {
  await assertCanManage(user, campaignId);
  const type = parseType(typeRaw);
  const existing = await prisma.campaignScreenshot.findUnique({
    where: { campaignId_type: { campaignId, type } },
  });
  if (!existing) throw new AuthError("Скриншот не найден", 404);

  await prisma.campaignScreenshot.delete({
    where: { id: existing.id },
  });
  await deleteCampaignScreenshotFile(existing.storageKey);
}

export async function attachScreenshotStatus(
  summaries: CampaignSummary[]
): Promise<CampaignSummary[]> {
  if (summaries.length === 0) return summaries;
  try {
    const ids = summaries.map((s) => s.campaign.id);
    const rows = await prisma.campaignScreenshot.findMany({
      where: { campaignId: { in: ids } },
      select: { campaignId: true, type: true },
    });
    const map = new Map<string, CampaignScreenshotStatus>();
    for (const id of ids) {
      map.set(id, { launch: false, reporting: false });
    }
    for (const row of rows) {
      const status = map.get(row.campaignId);
      if (!status) continue;
      if (row.type === "LAUNCH") status.launch = true;
      if (row.type === "REPORTING") status.reporting = true;
    }
    return summaries.map((s) => ({
      ...s,
      screenshotStatus: map.get(s.campaign.id) ?? {
        launch: false,
        reporting: false,
      },
    }));
  } catch (error) {
    // Schema may not be migrated yet in a long-lived process — keep list working.
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("campaign_screenshots") ||
      message.includes("CampaignScreenshot") ||
      message.includes("Unknown arg")
    ) {
      console.warn("[screenshots] status attach skipped:", message);
      return summaries.map((s) => ({
        ...s,
        screenshotStatus: s.screenshotStatus ?? {
          launch: false,
          reporting: false,
        },
      }));
    }
    throw error;
  }
}
