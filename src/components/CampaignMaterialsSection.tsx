"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCanWrite } from "@/components/auth/CurrentUserProvider";

type ScreenshotType = "LAUNCH" | "REPORTING";

type ScreenshotDto = {
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

const BLOCKS: {
  type: ScreenshotType;
  title: string;
  icon: string;
}[] = [
  { type: "LAUNCH", title: "Скриншот запуска", icon: "📸" },
  {
    type: "REPORTING",
    title: "Скриншот размещения в отчётности",
    icon: "📊",
  },
];

function cacheBust(url: string, updatedAt?: string): string {
  if (!updatedAt) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(updatedAt)}`;
}

function ScreenshotBlock({
  campaignId,
  type,
  title,
  icon,
  screenshot,
  canManage,
  busy,
  onUploaded,
  onDeleted,
  onPreview,
}: {
  campaignId: string;
  type: ScreenshotType;
  title: string;
  icon: string;
  screenshot: ScreenshotDto | null;
  canManage: boolean;
  busy: boolean;
  onUploaded: (shot: ScreenshotDto) => void;
  onDeleted: (type: ScreenshotType) => void;
  onPreview: (url: string, title: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);

  useEffect(() => {
    setImageBroken(false);
  }, [screenshot?.id, screenshot?.updated_at]);

  async function upload(file: File) {
    setError("");
    setImageBroken(false);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("type", type);
      form.set("file", file);
      const res = await fetch(`/api/campaigns/${campaignId}/screenshots`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      onUploaded(data.screenshot as ScreenshotDto);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (!screenshot) return;
    setError("");
    setUploading(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/screenshots?type=${type}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ошибка удаления");
      onDeleted(type);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setUploading(false);
    }
  }

  const previewUrl =
    screenshot && !imageBroken
      ? cacheBust(screenshot.url, screenshot.updated_at)
      : null;
  const uploaded = Boolean(screenshot) && !imageBroken;
  const disabled = busy || uploading;

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="px-3 pb-1 pt-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-slate-900">
            <span className="mr-1.5" aria-hidden>
              {icon}
            </span>
            {title}
          </CardTitle>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              uploaded
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {uploaded ? "Загружен" : "Не загружен"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {previewUrl ? (
          <button
            type="button"
            className="block w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-left"
            onClick={() => onPreview(previewUrl, title)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={title}
              className="max-h-48 w-full object-contain"
              onError={() => setImageBroken(true)}
            />
            <div className="border-t border-slate-100 px-2 py-1 text-[11px] text-slate-500">
              Нажмите, чтобы открыть крупно
            </div>
          </button>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
            Нет изображения
          </div>
        )}

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              {uploading
                ? "Загрузка..."
                : uploaded
                  ? "Заменить"
                  : "Загрузить"}
            </Button>
            {uploaded ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                disabled={disabled}
                onClick={() => void remove()}
              >
                Удалить
              </Button>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        <p className="text-[11px] text-slate-400">
          PNG, JPG/JPEG, WebP · до 10 MB
        </p>
      </CardContent>
    </Card>
  );
}

export function CampaignMaterialsSection({
  campaignId,
}: {
  campaignId: string;
}) {
  const canWrite = useCanWrite();
  const [items, setItems] = useState<ScreenshotDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(
    null
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/screenshots`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить материалы");
      setItems(Array.isArray(data.screenshots) ? data.screenshots : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const byType = (type: ScreenshotType) =>
    items.find((s) => s.type === type) ?? null;

  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Материалы кампании
      </h2>
      {loading ? (
        <p className="text-sm text-slate-500">Загрузка материалов...</p>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {BLOCKS.map((block) => (
          <ScreenshotBlock
            key={block.type}
            campaignId={campaignId}
            type={block.type}
            title={block.title}
            icon={block.icon}
            screenshot={byType(block.type)}
            canManage={canWrite}
            busy={loading}
            onUploaded={(shot) => {
              setItems((prev) => {
                const rest = prev.filter((s) => s.type !== shot.type);
                return [...rest, shot];
              });
            }}
            onDeleted={(type) => {
              setItems((prev) => prev.filter((s) => s.type !== type));
            }}
            onPreview={(url, title) => setPreview({ url, title })}
          />
        ))}
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={preview.title}
          onClick={() => setPreview(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setPreview(null);
          }}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl overflow-auto rounded-md bg-white p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-sm font-medium text-slate-800">{preview.title}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPreview(null)}
              >
                Закрыть
              </Button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.url}
              alt={preview.title}
              className="max-h-[80vh] w-full object-contain"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
