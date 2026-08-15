"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCanWrite } from "@/components/auth/CurrentUserProvider";
import { BRAND_FILTER_NONE, UNASSIGNED_BRAND_LABEL } from "@/lib/brands/filter";
import type { Client } from "@/lib/types";

type BrandRow = {
  id: string;
  name: string;
  client_id: string;
  campaignCount: number;
  created_at: string;
};

type ClientDetail = Client & {
  brands: BrandRow[];
  unassignedCampaignCount: number;
};

function campaignsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "кампания";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return "кампании";
  }
  return "кампаний";
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const canWrite = useCanWrite();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<BrandRow | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      if (!res.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : "Не удалось загрузить клиента";
        console.error("[clients/[id]] load failed", {
          status: res.status,
          data,
        });
        setError(message);
        setClient(null);
        return;
      }

      const brands = Array.isArray(data?.brands) ? data.brands : [];
      setClient({
        id: data.id,
        name: data.name,
        created_at: data.created_at,
        brands: brands.map(
          (b: {
            id: string;
            name: string;
            client_id: string;
            campaignCount?: number;
            created_at: string;
          }) => ({
            id: b.id,
            name: b.name,
            client_id: b.client_id,
            campaignCount: Number(b.campaignCount) || 0,
            created_at: b.created_at,
          })
        ),
        unassignedCampaignCount: Number(data?.unassignedCampaignCount) || 0,
      });
    } catch (e) {
      console.error("[clients/[id]] load exception", e);
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function createBrand() {
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[clients/[id]] createBrand failed", data);
        setFormError(
          typeof data?.error === "string" ? data.error : "Ошибка создания бренда"
        );
        return;
      }
      setAddOpen(false);
      setName("");
      await load();
    } catch (e) {
      console.error("[clients/[id]] createBrand exception", e);
      setFormError(e instanceof Error ? e.message : "Ошибка создания бренда");
    } finally {
      setSaving(false);
    }
  }

  async function renameBrand() {
    if (!renameTarget) return;
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(`/api/brands/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[clients/[id]] renameBrand failed", data);
        setFormError(
          typeof data?.error === "string"
            ? data.error
            : "Ошибка переименования"
        );
        return;
      }
      setRenameOpen(false);
      setRenameTarget(null);
      setName("");
      await load();
    } catch (e) {
      console.error("[clients/[id]] renameBrand exception", e);
      setFormError(
        e instanceof Error ? e.message : "Ошибка переименования"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteBrand(brand: BrandRow) {
    if (brand.campaignCount > 0) {
      setError("Нельзя удалить бренд, к которому привязаны кампании.");
      return;
    }
    if (!window.confirm(`Удалить бренд «${brand.name}»?`)) return;
    try {
      const res = await fetch(`/api/brands/${brand.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[clients/[id]] deleteBrand failed", data);
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Нельзя удалить бренд, к которому привязаны кампании."
        );
        return;
      }
      setError("");
      await load();
    } catch (e) {
      console.error("[clients/[id]] deleteBrand exception", e);
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Загрузка...</div>;
  }
  if (error && !client) {
    return (
      <div className="space-y-2">
        <Link href="/clients" className="text-sm text-slate-500 hover:text-slate-800">
          ← Clients
        </Link>
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }
  if (!client) return null;

  const brands = client.brands;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/clients" className="text-sm text-slate-500 hover:text-slate-800">
            ← Clients
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {client.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Бренды клиента и связанные кампании
          </p>
        </div>
        {canWrite ? (
          <Button
            className="gap-1.5"
            onClick={() => {
              setName("");
              setFormError("");
              setAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Добавить бренд
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Бренды
        </h2>
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-[11px] font-medium text-slate-500">
                  Name
                </TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-slate-500 text-right">
                  Campaigns
                </TableHead>
                {canWrite ? (
                  <TableHead className="h-8 text-[11px] font-medium text-slate-500 text-right">
                    Actions
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="text-sm">
                <TableCell className="py-2 font-medium text-slate-500">
                  {UNASSIGNED_BRAND_LABEL}
                </TableCell>
                <TableCell className="py-2 text-right tabular-nums text-slate-700">
                  <Link
                    href={`/campaigns?clientId=${clientId}&brandId=${BRAND_FILTER_NONE}`}
                    className="hover:underline"
                  >
                    {client.unassignedCampaignCount}{" "}
                    {campaignsWord(client.unassignedCampaignCount)}
                  </Link>
                </TableCell>
                {canWrite ? <TableCell className="py-2" /> : null}
              </TableRow>
              {brands.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canWrite ? 3 : 2}
                    className="py-4 text-center text-sm text-slate-500"
                  >
                    У клиента пока нет брендов
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((b) => (
                  <TableRow key={b.id} className="text-sm">
                    <TableCell className="py-2 font-medium text-slate-900">
                      {b.name}
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums text-slate-700">
                      <Link
                        href={`/campaigns?clientId=${clientId}&brandId=${b.id}`}
                        className="hover:underline"
                      >
                        {b.campaignCount} {campaignsWord(b.campaignCount)}
                      </Link>
                    </TableCell>
                    {canWrite ? (
                      <TableCell className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRenameTarget(b);
                              setName(b.name);
                              setFormError("");
                              setRenameOpen(true);
                            }}
                          >
                            Переименовать
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            disabled={b.campaignCount > 0}
                            title={
                              b.campaignCount > 0
                                ? "Нельзя удалить бренд, к которому привязаны кампании."
                                : undefined
                            }
                            onClick={() => deleteBrand(b)}
                          >
                            Удалить
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый бренд</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-200"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && !saving) {
                  e.preventDefault();
                  createBrand();
                }
              }}
            />
            {formError ? (
              <p className="text-sm text-rose-600">{formError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Отмена
            </Button>
            <Button onClick={createBrand} disabled={saving || !name.trim()}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open);
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать бренд</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-200"
            />
            {formError ? (
              <p className="text-sm text-rose-600">{formError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Отмена
            </Button>
            <Button onClick={renameBrand} disabled={saving || !name.trim()}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
