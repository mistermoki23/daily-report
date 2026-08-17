import "server-only";

import { createHash, randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
export const CAMPAIGN_SCREENSHOTS_BUCKET = "campaign-screenshots";

export const SCREENSHOT_MIME_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type AllowedScreenshotMime = keyof typeof SCREENSHOT_MIME_TYPES;

export function isAllowedScreenshotMime(mime: string): mime is AllowedScreenshotMime {
  return mime in SCREENSHOT_MIME_TYPES;
}

export function extensionForMime(mime: AllowedScreenshotMime): string {
  return SCREENSHOT_MIME_TYPES[mime];
}

/** Magic-byte sniff to avoid trusting client Content-Type alone. */
export function detectImageMime(buffer: Buffer): AllowedScreenshotMime | null {
  if (buffer.length >= 8) {
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return "image/png";
    }
  }
  if (buffer.length >= 3) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return "image/jpeg";
    }
  }
  if (buffer.length >= 12) {
    const riff = buffer.toString("ascii", 0, 4);
    const webp = buffer.toString("ascii", 8, 12);
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  return null;
}

function assertSafeStorageKey(storageKey: string): string {
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
    throw new Error("Некорректный ключ файла");
  }
  return normalized;
}

function storageErrorMessage(error: { message?: string } | null): string {
  return error?.message?.trim() || "Неизвестная ошибка Supabase Storage";
}

async function ensureScreenshotsBucket(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.getBucket(CAMPAIGN_SCREENSHOTS_BUCKET);
  if (data && !error) return;

  const created = await supabase.storage.createBucket(CAMPAIGN_SCREENSHOTS_BUCKET, {
    public: false,
    fileSizeLimit: `${MAX_SCREENSHOT_BYTES}`,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  if (created.error) {
    const message = storageErrorMessage(created.error);
    if (/already exists|duplicate/i.test(message)) return;
    throw new Error(
      `Не удалось создать bucket «${CAMPAIGN_SCREENSHOTS_BUCKET}»: ${message}. Создайте его в Supabase Dashboard → Storage (private) и повторите загрузку.`
    );
  }
}

export async function writeCampaignScreenshotFile(input: {
  campaignId: string;
  type: string;
  buffer: Buffer;
  mime: AllowedScreenshotMime;
}): Promise<{ storageKey: string; sizeBytes: number }> {
  await ensureScreenshotsBucket();
  const ext = extensionForMime(input.mime);
  const hash = createHash("sha256").update(input.buffer).digest("hex").slice(0, 12);
  const fileName = `${input.type.toLowerCase()}-${randomUUID()}-${hash}.${ext}`;
  const storageKey = assertSafeStorageKey(`${input.campaignId}/${fileName}`);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(CAMPAIGN_SCREENSHOTS_BUCKET)
    .upload(storageKey, input.buffer, {
      contentType: input.mime,
      upsert: false,
    });
  if (error) {
    throw new Error(`Не удалось загрузить файл в Storage: ${storageErrorMessage(error)}`);
  }
  return { storageKey, sizeBytes: input.buffer.length };
}

export type ScreenshotObjectCheck = "exists" | "missing" | "unavailable";

export async function checkCampaignScreenshotObject(
  storageKey: string
): Promise<ScreenshotObjectCheck> {
  try {
    const key = assertSafeStorageKey(storageKey);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(CAMPAIGN_SCREENSHOTS_BUCKET)
      .createSignedUrl(key, 30);
    if (data?.signedUrl && !error) return "exists";
    const message = storageErrorMessage(error);
    if (/not found|does not exist|no such file/i.test(message)) return "missing";
    console.warn("[screenshots] storage check unavailable:", message);
    return "unavailable";
  } catch (error) {
    console.warn("[screenshots] storage check failed:", error);
    return "unavailable";
  }
}

export async function readCampaignScreenshotFile(
  storageKey: string
): Promise<Buffer> {
  const key = assertSafeStorageKey(storageKey);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(CAMPAIGN_SCREENSHOTS_BUCKET)
    .download(key);
  if (error || !data) {
    throw new Error(
      `Файл не найден в Storage: ${storageErrorMessage(error)}`
    );
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteCampaignScreenshotFile(
  storageKey: string
): Promise<void> {
  const key = assertSafeStorageKey(storageKey);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(CAMPAIGN_SCREENSHOTS_BUCKET)
    .remove([key]);
  if (error && !/not found|does not exist/i.test(storageErrorMessage(error))) {
    throw new Error(`Не удалось удалить файл из Storage: ${storageErrorMessage(error)}`);
  }
}

/** ACL-protected preview URL (session cookie). Bytes live in private Storage. */
export function publicScreenshotUrl(campaignId: string, type: string): string {
  return `/api/campaigns/${campaignId}/screenshots/${type}/file`;
}
