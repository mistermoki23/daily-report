"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type ClientRow = {
  id: string;
  name: string;
  activeCampaigns: number;
  totalCampaigns: number;
  status: "active" | "inactive";
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [clientsRes, dashRes] = await Promise.all([
      fetch("/api/clients"),
      fetch("/api/dashboard"),
    ]);
    const clientsData = await clientsRes.json();
    const dash = await dashRes.json();
    const rows: ClientRow[] = clientsData.map(
      (c: { id: string; name: string }) => {
        const related = dash.campaigns.filter(
          (s: { campaign: { client_id: string } }) =>
            s.campaign.client_id === c.id
        );
        const active = related.filter(
          (s: { status: string }) => s.status !== "completed"
        ).length;
        return {
          id: c.id,
          name: c.name,
          activeCampaigns: active,
          totalCampaigns: related.length,
          status: active > 0 ? "active" : "inactive",
        };
      }
    );
    setClients(rows);
  }

  useEffect(() => {
    load();
  }, []);

  async function createClient() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка");
        return;
      }
      setOpen(false);
      setName("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Клиенты и связанные рекламные кампании
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Добавить клиента
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Client</TableHead>
              <TableHead className="text-xs text-right">Active campaigns</TableHead>
              <TableHead className="text-xs text-right">Total campaigns</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer text-sm hover:bg-slate-50"
                onClick={() => router.push(`/campaigns?clientId=${c.id}`)}
              >
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.activeCampaigns}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.totalCampaigns}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      c.status === "active"
                        ? "rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                        : "rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
                    }
                  >
                    {c.status === "active" ? "Active" : "Inactive"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый клиент</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-200"
            />
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={createClient} disabled={saving || !name.trim()}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
