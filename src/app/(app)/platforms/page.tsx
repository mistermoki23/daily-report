"use client";

import { useEffect, useState } from "react";
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
import type { Platform } from "@/lib/types";

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/platforms");
    setPlatforms(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function createPlatform() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/platforms", {
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
          <h1 className="text-xl font-semibold text-slate-900">Platforms</h1>
          <p className="mt-1 text-sm text-slate-500">
            Рекламные площадки хранятся в базе и могут расширяться
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Добавить площадку
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Platform</TableHead>
              <TableHead className="text-xs">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {platforms.map((p) => (
              <TableRow key={p.id} className="text-sm">
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-slate-500">
                  {new Date(p.created_at).toLocaleDateString("ru-RU")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая площадка</DialogTitle>
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
            <Button onClick={createPlatform} disabled={saving || !name.trim()}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
