"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCalculated,
  formatKpiValue,
  formatMoney,
  formatNumber,
} from "@/lib/calculations";
import {
  ALL_BRANDS_LABEL,
  BRAND_FILTER_NONE,
  UNASSIGNED_BRAND_LABEL,
} from "@/lib/brands/filter";
import {
  KPI_LABELS,
  type Brand,
  type Client,
  type CurrencyCode,
  type KpiType,
} from "@/lib/types";

type BrandReportMode = "daily" | "weekly";

type SpendByCurrency = Partial<Record<CurrencyCode, number>>;

type BrandMetricTotals = {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  spendByCurrency: SpendByCurrency;
  conversions: number;
  video_views: number;
};

type BrandDeviation = {
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  conversions: number | null;
  video_views: number | null;
  spendByCurrency: Partial<Record<CurrencyCode, number | null>>;
};

type Calculated = {
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  vtr: number | null;
  frequency: number | null;
};

type BrandReportRow = {
  kind: "day" | "week_total" | "platform";
  label: string;
  start: string;
  end: string;
  weekIndex?: number;
  platformId?: string | null;
  platformName?: string | null;
  plan: BrandMetricTotals;
  fact: BrandMetricTotals;
  deviation: BrandDeviation;
  calculatedPlan: Calculated;
  calculatedFact: Calculated;
};

type BrandReportWeekBlock = {
  weekIndex: number;
  label: string;
  start: string;
  end: string;
  total: BrandReportRow;
  platforms: BrandReportRow[];
};

type BrandReport = {
  client: Client;
  brand: Brand;
  brandFilter: "all" | "none" | "brand";
  period: { startDate: string; endDate: string };
  mode: BrandReportMode;
  currencies: CurrencyCode[];
  campaigns: {
    id: string;
    name: string;
    brand_id: string | null;
    brand_name: string;
    platform_id: string;
    platform_name: string;
    currency: CurrencyCode;
  }[];
  plan: BrandMetricTotals;
  fact: BrandMetricTotals;
  deviation: BrandDeviation;
  rows: BrandReportRow[];
  weeks: BrandReportWeekBlock[];
  activeKpis: KpiType[];
};

const SUMMARY_KPIS: KpiType[] = ["impressions", "spend", "clicks", "reach"];

function defaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  const toInput = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toInput(start), end: toInput(end) };
}

function formatDeviation(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ru-RU", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}%`;
}

function deviationClass(value: number | null | undefined): string {
  if (value == null || value === 0) return "text-slate-700";
  return value > 0 ? "text-emerald-700" : "text-rose-700";
}

function spendLines(spend: SpendByCurrency | undefined): string[] {
  const amount = spend?.USD ?? 0;
  return [formatMoney(amount, "USD")];
}

function SpendBlock({ spend }: { spend: SpendByCurrency | undefined }) {
  return (
    <div className="space-y-0.5">
      {spendLines(spend).map((line) => (
        <div key={line} className="tabular-nums">
          {line}
        </div>
      ))}
    </div>
  );
}

function SpendDeviationBlock({
  deviation,
}: {
  deviation: Partial<Record<CurrencyCode, number | null>> | undefined;
  plan?: SpendByCurrency | undefined;
}) {
  const value = deviation?.USD ?? null;
  if (value == null) return <span className="text-slate-500">—</span>;
  return (
    <div className={`tabular-nums ${deviationClass(value)}`}>
      {formatDeviation(value)}
    </div>
  );
}

function MetricTriple({
  kpi,
  plan,
  fact,
  deviation,
}: {
  kpi: KpiType;
  plan: BrandMetricTotals;
  fact: BrandMetricTotals;
  deviation: BrandDeviation;
}) {
  if (kpi === "spend") {
    return (
      <div className="space-y-1 text-sm">
        <div>
          <div className="text-[10px] uppercase text-slate-400">Plan</div>
          <SpendBlock spend={plan.spendByCurrency} />
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-400">Fact</div>
          <SpendBlock spend={fact.spendByCurrency} />
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-400">Deviation</div>
          <SpendDeviationBlock
            deviation={deviation.spendByCurrency}
          />
        </div>
      </div>
    );
  }

  const dev = deviation[kpi];
  return (
    <div className="space-y-1 text-sm">
      <div>
        <div className="text-[10px] uppercase text-slate-400">Plan</div>
        <div className="font-medium tabular-nums text-slate-900">
          {formatKpiValue(kpi, plan[kpi], "RUB")}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase text-slate-400">Fact</div>
        <div className="font-medium tabular-nums text-slate-900">
          {formatKpiValue(kpi, fact[kpi], "RUB")}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase text-slate-400">Deviation</div>
        <div className={`font-semibold tabular-nums ${deviationClass(dev)}`}>
          {formatDeviation(dev)}
        </div>
      </div>
    </div>
  );
}

function PlanFactDevCell({
  plan,
  fact,
  deviation,
}: {
  plan: string;
  fact: string;
  deviation: number | null;
}) {
  return (
    <div className="space-y-0.5 text-right text-xs leading-tight">
      <div className="tabular-nums text-slate-500">{plan}</div>
      <div className="tabular-nums font-medium text-slate-900">{fact}</div>
      <div className={`tabular-nums font-semibold ${deviationClass(deviation)}`}>
        {formatDeviation(deviation)}
      </div>
    </div>
  );
}

function MetricsTableRow({
  row,
  indent = false,
  emphasize = false,
  last = false,
}: {
  row: BrandReportRow;
  indent?: boolean;
  emphasize?: boolean;
  last?: boolean;
}) {
  const moneyCurrency: CurrencyCode = "USD";

  return (
    <TableRow className={`text-sm ${emphasize ? "bg-slate-50" : ""}`}>
      <TableCell
        className={`py-2 align-top text-slate-700 ${indent ? "pl-8 text-slate-600" : ""}`}
      >
        {indent ? (
          <span className="text-slate-400">{last ? "└─ " : "├─ "}</span>
        ) : null}
        <span className={emphasize ? "font-semibold" : ""}>{row.label}</span>
        <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
          Plan / Fact / Dev
        </div>
      </TableCell>
      <TableCell className="py-2 align-top">
        <PlanFactDevCell
          plan={formatNumber(row.plan.impressions)}
          fact={formatNumber(row.fact.impressions)}
          deviation={row.deviation.impressions}
        />
      </TableCell>
      <TableCell className="py-2 align-top">
        <PlanFactDevCell
          plan={formatNumber(row.plan.reach)}
          fact={formatNumber(row.fact.reach)}
          deviation={row.deviation.reach}
        />
      </TableCell>
      <TableCell className="py-2 align-top">
        <PlanFactDevCell
          plan={formatNumber(row.plan.clicks)}
          fact={formatNumber(row.fact.clicks)}
          deviation={row.deviation.clicks}
        />
      </TableCell>
      <TableCell className="py-2 align-top text-right text-xs">
        <div className="space-y-0.5">
          <SpendBlock spend={row.plan.spendByCurrency} />
          <SpendBlock spend={row.fact.spendByCurrency} />
          <SpendDeviationBlock
            deviation={row.deviation.spendByCurrency}
          />
        </div>
      </TableCell>
      <TableCell className="py-2 align-top text-right text-xs tabular-nums text-slate-700">
        <div className="text-slate-500">
          {formatCalculated("ctr", row.calculatedPlan.ctr, moneyCurrency)}
        </div>
        <div className="font-medium">
          {formatCalculated("ctr", row.calculatedFact.ctr, moneyCurrency)}
        </div>
      </TableCell>
      <TableCell className="py-2 align-top text-right text-xs tabular-nums text-slate-700">
        <div className="text-slate-500">
          {formatCalculated("cpm", row.calculatedPlan.cpm, moneyCurrency)}
        </div>
        <div className="font-medium">
          {formatCalculated("cpm", row.calculatedFact.cpm, moneyCurrency)}
        </div>
      </TableCell>
      <TableCell className="py-2 align-top text-right text-xs tabular-nums text-slate-700">
        <div className="text-slate-500">
          {formatCalculated("cpc", row.calculatedPlan.cpc, moneyCurrency)}
        </div>
        <div className="font-medium">
          {formatCalculated("cpc", row.calculatedFact.cpc, moneyCurrency)}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function BrandReportsPage() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [clients, setClients] = useState<Client[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [clientId, setClientId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [mode, setMode] = useState<BrandReportMode>("weekly");
  const [report, setReport] = useState<BrandReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadClients() {
      const res = await fetch("/api/clients");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setClients(list);
      if (list[0]) setClientId(list[0].id);
    }
    loadClients();
  }, []);

  useEffect(() => {
    setBrandId("");
    setReport(null);
    if (!clientId) {
      setBrands([]);
      return;
    }
    let cancelled = false;
    async function loadBrands() {
      const res = await fetch(`/api/brands?clientId=${clientId}`);
      const data = await res.json();
      if (cancelled) return;
      setBrands(Array.isArray(data) ? data : []);
    }
    loadBrands();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function loadReport() {
    setError("");
    if (!clientId || !startDate || !endDate) {
      setError("Выберите клиента и период");
      return;
    }
    if (endDate < startDate) {
      setError("Дата окончания не может быть раньше даты начала");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        clientId,
        startDate,
        endDate,
        mode,
      });
      if (brandId) params.set("brandId", brandId);
      const res = await fetch(`/api/brands/report?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setReport(null);
        setError(data.error || "Ошибка загрузки отчёта");
        return;
      }
      setReport(data as BrandReport);
    } finally {
      setLoading(false);
    }
  }

  async function exportExcel() {
    setError("");
    if (!clientId || !startDate || !endDate) {
      setError("Выберите клиента и период");
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/brands/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          brandId: brandId || undefined,
          startDate,
          endDate,
          mode,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data?.error === "string" ? data.error : "Ошибка экспорта"
        );
        return;
      }
      const blob = await res.blob();
      const header = res.headers.get("Content-Disposition") || "";
      const utfName = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const asciiName = header.match(/filename="([^"]+)"/i)?.[1];
      const filename = utfName
        ? decodeURIComponent(utfName)
        : asciiName || "brand-report.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const canRun = Boolean(clientId && startDate && endDate);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Brand Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plan пропорционален дням периода · все Spend / CPM / CPC в USD
              (конвертация по актуальному курсу)
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={exporting || !canRun}
          onClick={exportExcel}
        >
          {exporting ? "Экспорт..." : "Export Excel"}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-white p-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Client</Label>
          <Select
            value={clientId || undefined}
            onValueChange={(v) => setClientId(v ?? "")}
          >
            <SelectTrigger className="h-8 w-[160px] border-slate-200 text-sm">
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
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Brand</Label>
          <Select
            value={brandId || "__all__"}
            onValueChange={(v) => {
              setBrandId(!v || v === "__all__" ? "" : v);
              setReport(null);
            }}
            disabled={!clientId}
          >
            <SelectTrigger className="h-8 w-[160px] border-slate-200 text-sm">
              <SelectValue>
                {brandId === BRAND_FILTER_NONE
                  ? UNASSIGNED_BRAND_LABEL
                  : brandId
                    ? brands.find((b) => b.id === brandId)?.name ?? "Бренд"
                    : ALL_BRANDS_LABEL}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{ALL_BRANDS_LABEL}</SelectItem>
              <SelectItem value={BRAND_FILTER_NONE}>
                {UNASSIGNED_BRAND_LABEL}
              </SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Date from</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 w-[140px] border-slate-200 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Date to</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 w-[140px] border-slate-200 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Mode</Label>
          <div className="flex h-8 overflow-hidden rounded-md border border-slate-200">
            <button
              type="button"
              className={`px-3 text-xs ${
                mode === "daily"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setMode("daily")}
            >
              Daily
            </button>
            <button
              type="button"
              className={`px-3 text-xs ${
                mode === "weekly"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setMode("weekly")}
            >
              Weekly
            </button>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={loading || !canRun}
          onClick={loadReport}
        >
          {loading ? "Загрузка..." : "Показать"}
        </Button>
      </div>

      {clientId && brands.length === 0 ? (
        <p className="text-sm text-slate-500">
          У клиента пока нет брендов — отчёт покажет все кампании клиента.{" "}
          <Link
            href={`/clients/${clientId}`}
            className="underline hover:text-slate-800"
          >
            Добавить бренд
          </Link>
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          {report ? (
        <>
          <p className="text-xs text-slate-500">
            Финансовые показатели отчёта приведены к USD по актуальному курсу.
          </p>

          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Summary — {report.brand.name}
            </h2>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {SUMMARY_KPIS.map((kpi) => (
                <Card key={kpi} className="border-slate-200 shadow-none">
                  <CardHeader className="px-3 pb-1 pt-3">
                    <CardTitle className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {KPI_LABELS[kpi]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <MetricTriple
                      kpi={kpi}
                      plan={report.plan}
                      fact={report.fact}
                      deviation={report.deviation}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {mode === "daily" ? "Daily" : "Weekly"} rows
            </h2>
            <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-8 text-[11px] font-medium text-slate-500">
                      Period
                    </TableHead>
                    <TableHead className="h-8 text-right text-[11px] font-medium text-slate-500">
                      Impressions
                    </TableHead>
                    <TableHead className="h-8 text-right text-[11px] font-medium text-slate-500">
                      Reach
                    </TableHead>
                    <TableHead className="h-8 text-right text-[11px] font-medium text-slate-500">
                      Clicks
                    </TableHead>
                    <TableHead className="h-8 text-right text-[11px] font-medium text-slate-500">
                      Spend
                    </TableHead>
                    <TableHead className="h-8 text-right text-[11px] font-medium text-slate-500">
                      CTR
                    </TableHead>
                    <TableHead className="h-8 text-right text-[11px] font-medium text-slate-500">
                      CPM
                    </TableHead>
                    <TableHead className="h-8 text-right text-[11px] font-medium text-slate-500">
                      CPC
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mode === "weekly" ? (
                    (report.weeks ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-8 text-center text-sm text-slate-500"
                        >
                          Нет данных за период
                        </TableCell>
                      </TableRow>
                    ) : (
                      (report.weeks ?? []).map((week) => (
                        <Fragment key={week.weekIndex}>
                          <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableCell
                              colSpan={8}
                              className="py-2 text-sm font-semibold text-slate-900"
                            >
                              {week.label}
                            </TableCell>
                          </TableRow>
                          <MetricsTableRow row={week.total} emphasize />
                          {week.platforms.map((platform, idx) => (
                            <MetricsTableRow
                              key={`${week.weekIndex}-${platform.platformId}`}
                              row={platform}
                              indent
                              last={idx === week.platforms.length - 1}
                            />
                          ))}
                        </Fragment>
                      ))
                    )
                  ) : report.rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-slate-500"
                      >
                        Нет данных за период
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.rows.map((row) => (
                      <MetricsTableRow
                        key={`${row.start}-${row.end}`}
                        row={row}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Campaigns in report
            </h2>
            {report.campaigns.length === 0 ? (
              <p className="text-sm text-slate-500">
                Нет кампаний по выбранному фильтру
              </p>
            ) : (
              <ul className="space-y-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                {report.campaigns.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-baseline gap-x-2"
                  >
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="text-slate-800 hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span className="text-xs text-slate-400">
                      {c.platform_name} · {c.currency} ·{" "}
                      {c.brand_name || UNASSIGNED_BRAND_LABEL}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
