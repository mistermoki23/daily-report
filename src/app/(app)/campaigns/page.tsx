"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CampaignTable } from "@/components/CampaignTable";
import { FilterBar, type FilterState } from "@/components/FilterBar";
import { cn } from "@/lib/utils";
import type { CampaignSummary, Client, Platform } from "@/lib/types";

function CampaignsContent() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("clientId") ?? "";

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    clientId: initialClientId,
    platformId: "",
    month: "",
    status: "",
    search: "",
    currency: "",
  });

  useEffect(() => {
    if (initialClientId) {
      setFilters((prev) => ({ ...prev, clientId: initialClientId }));
    }
  }, [initialClientId]);

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
    async function load() {
      const [dashRes, clientsRes, platformsRes] = await Promise.all([
        fetch(`/api/dashboard?${query}`),
        fetch("/api/clients"),
        fetch("/api/platforms"),
      ]);
      const dash = await dashRes.json();
      const clientsData = await clientsRes.json();
      const platformsData = await platformsRes.json();
      setCampaigns(Array.isArray(dash?.campaigns) ? dash.campaigns : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setPlatforms(Array.isArray(platformsData) ? platformsData : []);
    }
    load();
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Campaigns</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Полный список кампаний и Plan vs Fact
          </p>
        </div>
        <Link href="/campaigns/new" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Plus className="h-3.5 w-3.5" />
          Создать кампанию
        </Link>
      </div>
      <FilterBar clients={clients} platforms={platforms} value={filters} onChange={setFilters} />
      <CampaignTable campaigns={campaigns} compact />
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Загрузка...</div>}>
      <CampaignsContent />
    </Suspense>
  );
}
