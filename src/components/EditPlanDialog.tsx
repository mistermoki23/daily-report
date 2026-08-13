"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EDITABLE_PLAN_KPIS,
  type EditablePlanKpi,
} from "@/lib/campaigns/plan-fields";
import { KPI_LABELS, type CampaignSummary } from "@/lib/types";

function planValue(summary: CampaignSummary, kpi: EditablePlanKpi): string {
  const row = summary.campaign.kpis.find((k) => k.kpi_type === kpi);
  if (row == null) return "";
  return String(row.planned_value);
}

function initialValues(summary: CampaignSummary): Record<EditablePlanKpi, string> {
  return {
    impressions: planValue(summary, "impressions"),
    reach: planValue(summary, "reach"),
    clicks: planValue(summary, "clicks"),
    spend: planValue(summary, "spend"),
    video_views: planValue(summary, "video_views"),
  };
}

function EditPlanForm({
  summary,
  onCancel,
  onSaved,
}: {
  summary: CampaignSummary;
  onCancel: () => void;
  onSaved: (next: CampaignSummary) => void;
}) {
  const [values, setValues] = useState(() => initialValues(summary));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setError("");
    setSaving(true);
    try {
      const body: Record<string, number | null> = {};
      for (const field of EDITABLE_PLAN_KPIS) {
        const raw = values[field].trim();
        if (raw === "") {
          body[field] = null;
          continue;
        }
        const n = Number(raw);
        if (Number.isNaN(n)) {
          setError(`Некорректное значение для ${KPI_LABELS[field]}`);
          return;
        }
        if (n < 0) {
          setError("Плановые значения не могут быть отрицательными");
          return;
        }
        body[field] = n;
      }

      const res = await fetch(`/api/campaigns/${summary.campaign.id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка сохранения");
        return;
      }
      onSaved(data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid gap-3 py-1">
        {EDITABLE_PLAN_KPIS.map((field) => (
          <div key={field} className="space-y-1">
            <Label className="text-xs text-slate-600">{KPI_LABELS[field]}</Label>
            <Input
              type="number"
              min={0}
              step="any"
              value={values[field]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field]: e.target.value }))
              }
              className="border-slate-200"
              placeholder="0"
            />
          </div>
        ))}
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
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditPlanDialog({
  open,
  onOpenChange,
  summary,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: CampaignSummary;
  onSaved: (next: CampaignSummary) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Редактировать план</DialogTitle>
          <DialogDescription>
            Измените плановые KPI. CPM, CTR, CPC, VTR, Frequency пересчитаются
            автоматически.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <EditPlanForm
            key={`${summary.campaign.id}-${summary.campaign.updated_at}`}
            summary={summary}
            onCancel={() => onOpenChange(false)}
            onSaved={(next) => {
              onSaved(next);
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
