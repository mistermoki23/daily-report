"use client";

import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getColumnDef,
  normalizeCampaignTablePrefs,
  type CampaignTableColumnId,
  type CampaignTablePrefs,
} from "@/lib/campaigns/table-columns";
import { cn } from "@/lib/utils";

export function CampaignTableColumnsDialog({
  open,
  onOpenChange,
  prefs,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: CampaignTablePrefs;
  onSave: (prefs: CampaignTablePrefs) => void;
}) {
  const [order, setOrder] = useState<CampaignTableColumnId[]>(prefs.columnOrder);
  const [visible, setVisible] = useState<Set<CampaignTableColumnId>>(
    () => new Set(prefs.visibleColumns)
  );
  const [dragId, setDragId] = useState<CampaignTableColumnId | null>(null);

  useEffect(() => {
    if (!open) return;
    setOrder(prefs.columnOrder);
    setVisible(new Set(prefs.visibleColumns));
    setDragId(null);
  }, [open, prefs]);

  function toggleVisible(id: CampaignTableColumnId, next: boolean) {
    if (id === "campaign") return;
    setVisible((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      copy.add("campaign");
      return copy;
    });
  }

  function moveItem(fromId: CampaignTableColumnId, toId: CampaignTableColumnId) {
    if (fromId === toId) return;
    setOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(fromId);
      const to = next.indexOf(toId);
      if (from < 0 || to < 0) return prev;
      next.splice(from, 1);
      next.splice(to, 0, fromId);
      return next;
    });
  }

  function handleSave() {
    onSave(
      normalizeCampaignTablePrefs({
        ...prefs,
        columnOrder: order,
        visibleColumns: order.filter((id) => visible.has(id) || id === "campaign"),
      })
    );
    onOpenChange(false);
  }

  function handleReset() {
    const defaults = normalizeCampaignTablePrefs(null);
    setOrder(defaults.columnOrder);
    setVisible(new Set(defaults.visibleColumns));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Настройка таблицы</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500">
          Отметьте колонки и перетащите строки, чтобы изменить порядок. Campaign
          всегда отображается.
        </p>
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
          {order.map((id) => {
            const def = getColumnDef(id);
            const required = Boolean(def.required);
            const checked = visible.has(id) || required;
            return (
              <li
                key={id}
                draggable
                onDragStart={() => setDragId(id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) moveItem(dragId, id);
                  setDragId(null);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5",
                  dragId === id ? "border-slate-400 bg-slate-50 opacity-80" : ""
                )}
              >
                <span
                  className="cursor-grab text-slate-400 active:cursor-grabbing"
                  title="Перетащить"
                  aria-hidden
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                <Checkbox
                  checked={checked}
                  disabled={required}
                  onCheckedChange={(value) =>
                    toggleVisible(id, Boolean(value))
                  }
                />
                <span className="flex-1 text-sm text-slate-800">
                  {def.label}
                  {required ? (
                    <span className="ml-1 text-[10px] uppercase text-slate-400">
                      обязательно
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            Сбросить
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              Сохранить
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
