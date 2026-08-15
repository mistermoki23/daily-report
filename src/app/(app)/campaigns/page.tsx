"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CampaignTable } from "@/components/CampaignTable";
import { FilterBar, type FilterState } from "@/components/FilterBar";
import { cn } from "@/lib/utils";
import type { Brand, CampaignSummary, Client, Platform } from "@/lib/types";
import { useCanWrite } from "@/components/auth/CurrentUserProvider";

function CampaignsContent() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("clientId") ?? "";
  const initialBrandId = searchParams.get("brandId") ?? "";
  const canWrite = useCanWrite();

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    clientId: initialClientId,
    brandId: initialBrandId,
    platformId: "",
    month: "",
    status: "",
    search: "",
    currency: "",
  });

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      clientId: initialClientId || prev.clientId,
      brandId: initialBrandId || (initialClientId ? prev.brandId : ""),
    }));
  }, [initialClientId, initialBrandId]);

  useEffect(() => {
    async function loadMeta() {
      const [clientsRes, platformsRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/platforms"),
      ]);
      const clientsData = await clientsRes.json();
      const platformsData = await platformsRes.json();
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setPlatforms(Array.isArray(platformsData) ? platformsData : []);
    }
    loadMeta();
  }, []);

  useEffect(() => {
    async function loadBrands() {
      if (!filters.clientId) {
        setBrands([]);
        return;
      }
      const res = await fetch(`/api/brands?clientId=${filters.clientId}`);
      const data = await res.json();
      setBrands(Array.isArray(data) ? data : []);
    }
    loadBrands();
  }, [filters.clientId]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.clientId) params.set("clientId", filters.clientId);
    if (filters.brandId) params.set("brandId", filters.brandId);
    if (filters.platformId) params.set("platformId", filters.platformId);
    if (filters.month) params.set("month", filters.month);
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.currency) params.set("currency", filters.currency);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    async function load() {
      const dashRes = await fetch(`/api/dashboard?${query}`);
      const dash = await dashRes.json();
      setCampaigns(Array.isArray(dash?.campaigns) ? dash.campaigns : []);
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
        {canWrite ? (
          <Link href="/campaigns/new" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            <Plus className="h-3.5 w-3.5" />
            Создать кампанию
          </Link>
        ) : null}
      </div>
      <FilterBar
        clients={clients}
        brands={brands}
        platforms={platforms}
        value={filters}
        onChange={setFilters}
      />
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
