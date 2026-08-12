"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Plus,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Flag,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CampaignCard } from "@/components/CampaignCard";
import { CampaignTable } from "@/components/CampaignTable";
import { DailyUpdateCenter } from "@/components/DailyUpdateCenter";
import { FilterBar, type FilterState } from "@/components/FilterBar";
import { cn } from "@/lib/utils";
import {
  formatNumber,
} from "@/lib/calculations";
import type {
  CampaignSummary,
  Client,
  DailyUpdateItem,
  DashboardStats,
  PerformanceSummary,
  Platform,
} from "@/lib/types";

type ViewMode = "all" | "client" | "platform";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [dailyUpdate, setDailyUpdate] = useState<{
    count: number;
    items: DailyUpdateItem[];
  }>({ count: 0, items: [] });
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [view, setView] = useState<ViewMode>("all");
  const [filters, setFilters] = useState<FilterState>({
    clientId: "",
    platformId: "",
    month: "",
    status: "",
    search: "",
    currency: "",
  });
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.clientId) params.set("clientId", filters.clientId);
    if (filters.platformId) params.set("platformId", filters.platformId);
    if (filters.month) params.set("month", filters.month);
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.currency) params.set("currency", filters.currency);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [dashRes, clientsRes, platformsRes] = await Promise.all([
        fetch(`/api/dashboard?${query}`),
        fetch("/api/clients"),
        fetch("/api/platforms"),
      ]);
      const dash = await dashRes.json();
      if (!cancelled) {
        setStats(dash.stats);
        setCampaigns(dash.campaigns);
        setDailyUpdate(dash.dailyUpdate);
        setPerformance(dash.performance);
        setClients(await clientsRes.json());
        setPlatforms(await platformsRes.json());
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const todayLabel = format(new Date(), "d MMMM yyyy", { locale: ru });
  const activeCampaigns = campaigns.filter((c) => c.status !== "completed");

  const grouped = useMemo(() => {
    if (view === "all") return null;
    const map = new Map<string, CampaignSummary[]>();
    for (const c of activeCampaigns) {
      const key =
        view === "client" ? c.campaign.client.name : c.campaign.platform.name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "ru"));
  }, [activeCampaigns, view]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Campaign Monitoring
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{todayLabel}</p>
        </div>
        <Link href="/campaigns/new" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Plus className="h-3.5 w-3.5" />
          Создать кампанию
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Overview
        </h2>
        <div className="grid grid-cols-5 gap-2">
          <CampaignCard title="Active" value={stats?.active ?? "—"} icon={Activity} />
          <CampaignCard title="On track" value={stats?.onTrack ?? "—"} icon={CheckCircle2} tone="success" />
          <CampaignCard title="Attention" value={stats?.attention ?? "—"} icon={AlertTriangle} tone="warning" />
          <CampaignCard title="Critical" value={stats?.critical ?? "—"} icon={XCircle} tone="danger" />
          <CampaignCard title="Completed" value={stats?.completed ?? "—"} icon={Flag} tone="muted" />
        </div>
      </section>

      <section>
        <DailyUpdateCenter count={dailyUpdate.count} items={dailyUpdate.items} />
      </section>

      {performance ? (
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Performance summary
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <CampaignCard title="Total Impressions" value={formatNumber(performance.totalImpressions)} />
            <CampaignCard title="Total Clicks" value={formatNumber(performance.totalClicks)} />
            <CampaignCard title="Total Spend*" value={formatNumber(Math.round(performance.totalSpend))} subtitle="*без конвертации валют" />
            <CampaignCard title="Total Conversions" value={formatNumber(performance.totalConversions)} />
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Campaign performance
          </h2>
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5">
            {(
              [
                ["all", "All campaigns"],
                ["client", "By client"],
                ["platform", "By platform"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={cn(
                  "rounded px-2 py-1 text-[11px]",
                  view === key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <FilterBar clients={clients} platforms={platforms} value={filters} onChange={setFilters} />
        {loading ? (
          <div className="rounded-md border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
            Загрузка...
          </div>
        ) : view === "all" ? (
          <CampaignTable campaigns={activeCampaigns} compact />
        ) : (
          <div className="space-y-3">
            {grouped?.map(([group, rows]) => (
              <div key={group} className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{group}</h3>
                  <span className="text-xs text-slate-500">
                    {rows.length} {rows.length === 1 ? "campaign" : "campaigns"}
                  </span>
                </div>
                <CampaignTable campaigns={rows} compact />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
