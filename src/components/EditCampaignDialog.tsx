"use client";

import { useEffect, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  CURRENCIES,
  KPI_LABELS,
  KPI_TYPES,
  type Brand,
  type CampaignSummary,
  type Client,
  type CurrencyCode,
  type KpiType,
  type Platform,
} from "@/lib/types";

function dateInput(value: string): string {
  return value.slice(0, 10);
}

function EditCampaignForm({
  summary,
  onCancel,
  onSaved,
}: {
  summary: CampaignSummary;
  onCancel: () => void;
  onSaved: (next: CampaignSummary) => void;
}) {
  const c = summary.campaign;
  const [clients, setClients] = useState<Client[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [brands, setBrands] = useState<Brand[]>(() => (c.brand ? [c.brand] : []));
  const [name, setName] = useState(c.name);
  const [clientId, setClientId] = useState(c.client_id);
  const [brandId, setBrandId] = useState(c.brand_id ?? "");
  const [platformId, setPlatformId] = useState(c.platform_id);
  const [startDate, setStartDate] = useState(dateInput(c.start_date));
  const [endDate, setEndDate] = useState(dateInput(c.end_date));
  const [currency, setCurrency] = useState<CurrencyCode>(c.currency);
  const [primaryKpi, setPrimaryKpi] = useState<KpiType>(c.primary_kpi);
  const [activeKpis, setActiveKpis] = useState<Record<KpiType, boolean>>(() => {
    const active = new Set(c.kpis.map((k) => k.kpi_type));
    return Object.fromEntries(
      KPI_TYPES.map((t) => [t, active.has(t)])
    ) as Record<KpiType, boolean>;
  });
  const [kpiValues, setKpiValues] = useState<Record<KpiType, string>>(() => {
    const map = Object.fromEntries(KPI_TYPES.map((t) => [t, ""])) as Record<
      KpiType,
      string
    >;
    for (const k of c.kpis) {
      map[k.kpi_type] = String(k.planned_value);
    }
    return map;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [cl, pl] = await Promise.all([
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/platforms").then((r) => r.json()),
      ]);
      setClients(Array.isArray(cl) ? cl : []);
      setPlatforms(Array.isArray(pl) ? pl : []);
    }
    load();
  }, []);

  useEffect(() => {
    if (!clientId) {
      setBrands([]);
      return;
    }
    let cancelled = false;
    async function loadBrands() {
      const res = await fetch(`/api/brands?clientId=${clientId}`);
      const data = await res.json();
      if (!cancelled) setBrands(Array.isArray(data) ? data : []);
    }
    loadBrands();
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  const selectedTypes = KPI_TYPES.filter((t) => activeKpis[t]);

  async function onSave() {
    setError("");
    setSaving(true);
    try {
      const trimmed = name.trim();
      if (!trimmed) {
        setError("Название кампании обязательно");
        return;
      }
      if (!startDate || !endDate) {
        setError("Даты кампании некорректны");
        return;
      }
      if (endDate < startDate) {
        setError("Дата окончания не может быть раньше даты начала");
        return;
      }
      if (selectedTypes.length === 0) {
        setError("Укажите хотя бы один плановый KPI");
        return;
      }
      if (!selectedTypes.includes(primaryKpi)) {
        setError("Primary KPI должен быть среди выбранных KPI");
        return;
      }

      const kpis: { kpi_type: KpiType; planned_value: number }[] = [];
      for (const t of selectedTypes) {
        const n = Number(kpiValues[t] || 0);
        if (Number.isNaN(n)) {
          setError(`Некорректное значение для ${KPI_LABELS[t]}`);
          return;
        }
        if (n < 0) {
          setError("Плановые значения не могут быть отрицательными");
          return;
        }
        kpis.push({ kpi_type: t, planned_value: n });
      }

      const res = await fetch(`/api/campaigns/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          client_id: clientId,
          brand_id: brandId || null,
          platform_id: platformId,
          start_date: startDate,
          end_date: endDate,
          currency,
          primary_kpi: primaryKpi,
          kpis,
        }),
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
      <div className="max-h-[70vh] space-y-4 overflow-y-auto py-1 pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Campaign name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Client</Label>
            <Select
              value={clientId}
              onValueChange={(v) => {
                setClientId(v ?? "");
                setBrandId("");
                setBrands([]);
              }}
            >
              <SelectTrigger className="w-full border-slate-200">
                <SelectValue placeholder="Клиент" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((cl) => (
                  <SelectItem key={cl.id} value={cl.id}>
                    {cl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Brand</Label>
            <Select
              value={brandId || "__none__"}
              onValueChange={(v) =>
                setBrandId(!v || v === "__none__" ? "" : v)
              }
              disabled={!clientId}
            >
              <SelectTrigger className="w-full border-slate-200">
                <SelectValue>
                  {brandId
                    ? brands.find((b) => b.id === brandId)?.name ?? "Бренд"
                    : "Без бренда"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Без бренда</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientId && brands.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                У клиента пока нет брендов.{" "}
                <Link
                  href={`/clients/${clientId}`}
                  className="underline hover:text-slate-800"
                  onClick={() => onCancel()}
                >
                  Добавить на странице клиента
                </Link>
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Platform</Label>
            <Select
              value={platformId}
              onValueChange={(v) => setPlatformId(v ?? "")}
            >
              <SelectTrigger className="w-full border-slate-200">
                <SelectValue placeholder="Площадка" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Start date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Currency</Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency((v as CurrencyCode) || "RUB")}
            >
              <SelectTrigger className="w-full border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((cur) => (
                  <SelectItem key={cur.code} value={cur.code}>
                    {cur.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Primary KPI</Label>
            <Select
              value={primaryKpi}
              onValueChange={(v) =>
                setPrimaryKpi((v as KpiType) || "impressions")
              }
            >
              <SelectTrigger className="w-full border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(selectedTypes.length > 0 ? selectedTypes : KPI_TYPES).map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      {KPI_LABELS[t]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Плановые KPI
          </div>
          {KPI_TYPES.map((type) => (
            <div
              key={type}
              className="rounded-md border border-slate-200 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={activeKpis[type]}
                  onCheckedChange={(checked) => {
                    const on = Boolean(checked);
                    setActiveKpis((prev) => ({ ...prev, [type]: on }));
                    if (!on && primaryKpi === type) {
                      const next = KPI_TYPES.find(
                        (t) => t !== type && activeKpis[t]
                      );
                      if (next) setPrimaryKpi(next);
                    }
                  }}
                />
                <span className="text-sm font-medium text-slate-800">
                  {KPI_LABELS[type]}
                </span>
              </div>
              {activeKpis[type] ? (
                <div className="ml-6 mt-2">
                  <Label className="text-[11px] text-slate-500">Plan</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={kpiValues[type]}
                    onChange={(e) =>
                      setKpiValues((prev) => ({
                        ...prev,
                        [type]: e.target.value,
                      }))
                    }
                    className="mt-1 border-slate-200"
                    placeholder="0"
                  />
                </div>
              ) : null}
            </div>
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
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditCampaignDialog({
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
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Редактировать кампанию</DialogTitle>
          <DialogDescription>
            Измените параметры кампании и плановые KPI. Все изменения
            сохраняются в историю.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <EditCampaignForm
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
