"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CURRENCIES,
  KPI_LABELS,
  KPI_TYPES,
  type Brand,
  type Client,
  type CurrencyCode,
  type KpiType,
  type Platform,
} from "@/lib/types";

export default function NewCampaignPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("RUB");
  const [primaryKpi, setPrimaryKpi] = useState<KpiType>("impressions");
  const [activeKpis, setActiveKpis] = useState<Record<KpiType, boolean>>({
    impressions: true,
    reach: true,
    clicks: true,
    spend: true,
    video_views: true,
    conversions: false,
  });
  const [kpiValues, setKpiValues] = useState<Record<KpiType, string>>({
    impressions: "",
    reach: "",
    clicks: "",
    spend: "",
    video_views: "",
    conversions: "",
  });

  useEffect(() => {
    async function load() {
      const [c, p] = await Promise.all([
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/platforms").then((r) => r.json()),
      ]);
      setClients(c);
      setPlatforms(p);
      if (c[0]) setClientId(c[0].id);
      if (p[0]) setPlatformId(p[0].id);
    }
    load();
  }, []);

  useEffect(() => {
    setBrandId("");
    setBrands([]);
    if (!clientId) return;
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (!selectedTypes.includes(primaryKpi)) {
        setError("Primary KPI должен быть среди выбранных KPI");
        return;
      }
      const kpis = selectedTypes.map((t) => ({
        kpi_type: t,
        planned_value: Number(kpiValues[t] || 0),
      }));

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          brand_id: brandId || null,
          platform_id: platformId,
          name,
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
      router.push(`/campaigns/${data.campaign.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href="/campaigns" className="text-sm text-slate-500 hover:text-slate-800">
          ← К списку кампаний
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Новая кампания</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Выберите KPI, валюту и Primary KPI для статуса
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="px-4 pb-2 pt-3">
            <CardTitle className="text-sm font-semibold">Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Client</Label>
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
                <SelectTrigger className="w-full border-slate-200">
                  <SelectValue placeholder="Клиент" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
                  >
                    Добавить на странице клиента
                  </Link>
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Platform</Label>
              <Select value={platformId} onValueChange={(v) => setPlatformId(v ?? "")}>
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Campaign name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
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
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Primary KPI</Label>
              <Select
                value={primaryKpi}
                onValueChange={(v) => setPrimaryKpi((v as KpiType) || "impressions")}
              >
                <SelectTrigger className="w-full border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {KPI_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-none">
          <CardHeader className="px-4 pb-2 pt-3">
            <CardTitle className="text-sm font-semibold">Выберите KPI кампании</CardTitle>
            <p className="text-xs text-slate-500">
              Calculated metrics (CPM, CTR, CPC, CPA, VTR, Frequency) считаются автоматически
            </p>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4">
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
                        const next = KPI_TYPES.find((t) => t !== type && activeKpis[t]);
                        if (next) setPrimaryKpi(next);
                      }
                    }}
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {KPI_LABELS[type]}
                  </span>
                  {type === "reach" ? (
                    <span className="text-[10px] text-slate-400">cumulative</span>
                  ) : null}
                </div>
                {activeKpis[type] ? (
                  <div className="mt-2 ml-6">
                    <Label className="text-[11px] text-slate-500">Plan</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={kpiValues[type]}
                      onChange={(e) =>
                        setKpiValues((prev) => ({ ...prev, [type]: e.target.value }))
                      }
                      required
                      className="mt-1 border-slate-200"
                      placeholder="Плановое значение"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Отмена
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Сохранение..." : "Создать кампанию"}
          </Button>
        </div>
      </form>
    </div>
  );
}
