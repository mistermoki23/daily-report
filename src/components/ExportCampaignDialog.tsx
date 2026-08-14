"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  campaignDatePresets,
  EXPORT_KPI_LABELS,
} from "@/lib/campaigns/export-shared";
import { KPI_TYPES, type CampaignSummary, type KpiType } from "@/lib/types";

function ExportCampaignForm({
  summary,
  onCancel,
}: {
  summary: CampaignSummary;
  onCancel: () => void;
}) {
  const campaignKpis = useMemo(
    () =>
      KPI_TYPES.filter((t) =>
        summary.campaign.kpis.some((k) => k.kpi_type === t)
      ),
    [summary]
  );
  const presets = useMemo(
    () =>
      campaignDatePresets(summary.campaign.start_date, summary.campaign.end_date),
    [summary]
  );

  const [startDate, setStartDate] = useState(presets.full.start);
  const [endDate, setEndDate] = useState(presets.full.end);
  const [selected, setSelected] = useState<Record<KpiType, boolean>>(() => {
    const map = Object.fromEntries(KPI_TYPES.map((t) => [t, false])) as Record<
      KpiType,
      boolean
    >;
    for (const t of campaignKpis) map[t] = true;
    return map;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function applyRange(start: string, end: string) {
    setStartDate(start);
    setEndDate(end);
  }

  async function onExport() {
    setError("");
    setSaving(true);
    try {
      if (!startDate || !endDate) {
        setError("Даты экспорта некорректны");
        return;
      }
      if (endDate < startDate) {
        setError("Дата окончания не может быть раньше даты начала");
        return;
      }
      const kpis = campaignKpis.filter((t) => selected[t]);
      if (kpis.length === 0) {
        setError("Выберите хотя бы одну метрику");
        return;
      }

      const res = await fetch(`/api/campaigns/${summary.campaign.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          kpis,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Ошибка экспорта");
        return;
      }

      const blob = await res.blob();
      const header = res.headers.get("Content-Disposition") || "";
      const utfName = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const asciiName = header.match(/filename="([^"]+)"/i)?.[1];
      const filename = utfName
        ? decodeURIComponent(utfName)
        : asciiName || "campaign-export.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onCancel();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-4 py-1">
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyRange(presets.full.start, presets.full.end)}
          >
            Весь период
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              applyRange(presets.currentMonth.start, presets.currentMonth.end)
            }
          >
            Текущий месяц
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => applyRange(presets.last7.start, presets.last7.end)}
          >
            Последние 7 дней
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Дата начала</Label>
            <Input
              type="date"
              value={startDate}
              min={summary.campaign.start_date.slice(0, 10)}
              max={summary.campaign.end_date.slice(0, 10)}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Дата окончания</Label>
            <Input
              type="date"
              value={endDate}
              min={summary.campaign.start_date.slice(0, 10)}
              max={summary.campaign.end_date.slice(0, 10)}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-slate-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Метрики
          </div>
          {campaignKpis.map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <Checkbox
                checked={selected[type]}
                onCheckedChange={(checked) =>
                  setSelected((prev) => ({ ...prev, [type]: Boolean(checked) }))
                }
              />
              <span className="font-medium text-slate-800">
                {EXPORT_KPI_LABELS[type]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Отмена
        </Button>
        <Button type="button" onClick={onExport} disabled={saving}>
          {saving ? "Экспорт..." : "Скачать Excel"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ExportCampaignDialog({
  open,
  onOpenChange,
  summary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: CampaignSummary;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Экспорт данных</DialogTitle>
          <DialogDescription>
            Выберите период и метрики. В Excel попадут только данные за эти даты.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ExportCampaignForm
            key={`${summary.campaign.id}-${summary.campaign.updated_at}`}
            summary={summary}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
