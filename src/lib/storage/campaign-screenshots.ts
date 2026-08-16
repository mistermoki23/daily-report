import "server-only";

import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

export const SCREENSHOT_MIME_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type AllowedScreenshotMime = keyof typeof SCREENSHOT_MIME_TYPES;

const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads", "campaign-screenshots");

function assertSafeRelativeKey(storageKey: string): string {
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    path.isAbsolute(normalized)
  ) {
    throw new Error("Некорректный ключ файла");
  }
  return normalized;
}

export function resolveScreenshotAbsolutePath(storageKey: string): string {
  const relative = assertSafeRelativeKey(storageKey);
  const absolute = path.resolve(UPLOAD_ROOT, relative);
  const rootResolved = path.resolve(UPLOAD_ROOT);
  if (!absolute.startsWith(rootResolved + path.sep) && absolute !== rootResolved) {
    throw new Error("Некорректный путь файла");
  }
  return absolute;
}

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

export async function writeCampaignScreenshotFile(input: {
  campaignId: string;
  type: string;
  buffer: Buffer;
  mime: AllowedScreenshotMime;
}): Promise<{ storageKey: string; sizeBytes: number }> {
  const ext = extensionForMime(input.mime);
  const hash = createHash("sha256").update(input.buffer).digest("hex").slice(0, 12);
  const fileName = `${input.type.toLowerCase()}-${randomUUID()}-${hash}.${ext}`;
  const storageKey = path.posix.join(input.campaignId, fileName);
  const absolute = resolveScreenshotAbsolutePath(storageKey);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, input.buffer, { flag: "wx" });
  return { storageKey, sizeBytes: input.buffer.length };
}

export async function readCampaignScreenshotFile(
  storageKey: string
): Promise<Buffer> {
  const absolute = resolveScreenshotAbsolutePath(storageKey);
  return fs.readFile(absolute);
}

export async function deleteCampaignScreenshotFile(
  storageKey: string
): Promise<void> {
  try {
    const absolute = resolveScreenshotAbsolutePath(storageKey);
    await fs.unlink(absolute);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}

export function publicScreenshotUrl(
  campaignId: string,
  type: string
): string {
  return `/api/campaigns/${campaignId}/screenshots/${type}/file`;
}
