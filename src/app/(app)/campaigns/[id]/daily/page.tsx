"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DailyMetricsTable } from "@/components/DailyMetricsTable";
import { CalculatedMetricsBlock } from "@/components/CalculatedMetricsBlock";
import { StatusBadge } from "@/components/StatusBadge";
import {
  availableCalculatedMetrics,
  buildDailyCalculatedRows,
  formatCalculated,
  getMissingDates,
} from "@/lib/calculations";
import type { CampaignSummary, DailyMetric, KpiType } from "@/lib/types";
import { KPI_LABELS } from "@/lib/types";

type FormState = Record<KpiType | "date", string>;

function emptyForm(active: KpiType[]): FormState {
  const base: FormState = {
    date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    impressions: "",
    reach: "",
    clicks: "",
    spend: "",
    conversions: "",
    video_views: "",
  };
  for (const k of active) base[k] = "";
  return base;
}

export default function CampaignDailyPage() {
  const params = useParams<{ id: string }>();
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyMetric | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm([]));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/campaigns/${params.id}`);
    const data = await res.json();
    if (res.ok) setSummary(data);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  const activeKpis = useMemo(
    () => (summary?.campaign.kpis.map((k) => k.kpi_type) ?? []) as KpiType[],
    [summary]
  );

  const missing = useMemo(() => {
    if (!summary) return [];
    return getMissingDates(
      summary.campaign.start_date,
      summary.campaign.end_date,
      summary.campaign.daily_metrics
    );
  }, [summary]);

  const calculatedRows = useMemo(() => {
    if (!summary) return [];
    return buildDailyCalculatedRows(
      summary.campaign,
      summary.campaign.daily_metrics,
      activeKpis
    ).filter((r) => r.hasData);
  }, [summary, activeKpis]);

  function openCreate() {
    setEditing(null);
    setError("");
    const base = emptyForm(activeKpis);
    if (missing.length > 0) base.date = missing[missing.length - 1];
    setForm(base);
    setOpen(true);
  }

  function openEdit(metric: DailyMetric) {
    setEditing(metric);
    setError("");
    const next = emptyForm(activeKpis);
    next.date = metric.date.slice(0, 10);
    for (const kpi of activeKpis) {
      const v = metric[kpi];
      next[kpi] = v != null ? String(v) : "";
    }
    setForm(next);
    setOpen(true);
  }

  function parseValue(raw: string): number | null {
    if (raw.trim() === "") return null;
    return Number(raw);
  }

  async function onSave() {
    if (!summary) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string | number | null> = { date: form.date };
      for (const kpi of activeKpis) {
        payload[kpi] = parseValue(form[kpi]);
      }

      const url = editing
        ? `/api/campaigns/${params.id}/daily/${editing.id}`
        : `/api/campaigns/${params.id}/daily`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка сохранения");
        return;
      }
      setSummary(data.summary);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!summary) return <div className="text-sm text-slate-500">Загрузка...</div>;

  const currency = summary.campaign.currency;
  const calcKeys = availableCalculatedMetrics(activeKpis);
  const hasVideo = activeKpis.includes("video_views");
  const hasReach = activeKpis.includes("reach");

  // Live preview of calculated metrics from form values (for dialog)
  const previewCalc = (() => {
    if (!open) return null;
    const impressions = parseValue(form.impressions) ?? 0;
    const reach = parseValue(form.reach);
    const clicks = parseValue(form.clicks) ?? 0;
    const spend = parseValue(form.spend) ?? 0;
    const conversions = parseValue(form.conversions) ?? 0;
    const videoViews = parseValue(form.video_views) ?? 0;

    // Approximate frequency with previous cumulative + this day
    const prior = summary.campaign.daily_metrics.filter(
      (m) => m.date < form.date && (!editing || m.id !== editing.id)
    );
    let cumImp = prior.reduce((s, m) => s + (m.impressions ?? 0), 0) + impressions;
    let cumReach: number | null = null;
    for (const m of [...prior].sort((a, b) => a.date.localeCompare(b.date))) {
      if (m.reach != null) cumReach = m.reach;
    }
    if (reach != null) cumReach = reach;

    return {
      cpm:
        activeKpis.includes("spend") && activeKpis.includes("impressions") && impressions > 0
          ? (spend / impressions) * 1000
          : null,
      ctr:
        activeKpis.includes("clicks") && activeKpis.includes("impressions") && impressions > 0
          ? (clicks / impressions) * 100
          : null,
      cpc:
        activeKpis.includes("spend") && activeKpis.includes("clicks") && clicks > 0
          ? spend / clicks
          : null,
      cpa:
        activeKpis.includes("spend") &&
        activeKpis.includes("conversions") &&
        conversions > 0
          ? spend / conversions
          : null,
      vtr:
        hasVideo && impressions > 0 ? (videoViews / impressions) * 100 : null,
      frequency:
        hasReach && cumReach && cumReach > 0 && cumImp > 0
          ? cumImp / cumReach
          : null,
    };
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/campaigns/${summary.campaign.id}`}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ← {summary.campaign.name}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">Daily Data</h1>
            <StatusBadge status={summary.status} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {summary.campaign.client.name} · {summary.campaign.platform.name} ·{" "}
            {currency}
          </p>
          {missing.length > 0 ? (
            <p className="mt-1.5 text-sm text-amber-700">
              Missing data: {missing.length} {missing.length === 1 ? "day" : "days"}
            </p>
          ) : null}
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add day
        </Button>
      </div>

      <CalculatedMetricsBlock
        comparisons={summary.calculatedComparisons}
        currency={currency}
      />

      <section className="space-y-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Daily Data
        </h2>
        <DailyMetricsTable
          metrics={summary.campaign.daily_metrics}
          activeKpis={activeKpis}
          currency={currency}
          onEdit={openEdit}
          calculatedRows={calculatedRows}
        />
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Редактировать день" : "Добавить день"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2.5 overflow-y-auto py-1">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="border-slate-200"
              />
            </div>
            {activeKpis.map((kpi) => (
              <div key={kpi} className="space-y-1">
                <Label className="text-xs">
                  {KPI_LABELS[kpi]}
                  {kpi === "reach" ? " (cumulative)" : ""}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={form[kpi]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [kpi]: e.target.value }))
                  }
                  className="border-slate-200"
                />
              </div>
            ))}
            {previewCalc ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                <div className="mb-1 font-medium text-slate-700">Авторасчёт</div>
                <div className="grid grid-cols-2 gap-1">
                  {calcKeys.includes("cpm") ? (
                    <span>CPM: {formatCalculated("cpm", previewCalc.cpm, currency)}</span>
                  ) : null}
                  {calcKeys.includes("ctr") ? (
                    <span>CTR: {formatCalculated("ctr", previewCalc.ctr, currency)}</span>
                  ) : null}
                  {calcKeys.includes("cpc") ? (
                    <span>CPC: {formatCalculated("cpc", previewCalc.cpc, currency)}</span>
                  ) : null}
                  {calcKeys.includes("cpa") ? (
                    <span>CPA: {formatCalculated("cpa", previewCalc.cpa, currency)}</span>
                  ) : null}
                  {calcKeys.includes("vtr") ? (
                    <span>VTR: {formatCalculated("vtr", previewCalc.vtr, currency)}</span>
                  ) : null}
                  {calcKeys.includes("frequency") ? (
                    <span>
                      Freq:{" "}
                      {formatCalculated("frequency", previewCalc.frequency, currency)}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
