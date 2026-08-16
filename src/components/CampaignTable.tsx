"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { CampaignTableColumnsDialog } from "@/components/CampaignTableColumnsDialog";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useCampaignTablePrefs } from "@/hooks/useCampaignTablePrefs";
import {
  formatDisplayDate,
  formatKpiValue,
  formatNumber,
  formatPercent,
} from "@/lib/calculations";
import { brandDisplayName } from "@/lib/brands/filter";
import {
  getColumnDef,
  sortCampaignSummaries,
  toggleSortDirection,
  type CampaignTableColumnId,
  type CampaignTablePrefs,
} from "@/lib/campaigns/table-columns";
import { KPI_LABELS, type CampaignSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

function ScreenshotDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={ok ? `${label}: загружен` : `${label}: не загружен`}
      className={`inline-flex h-2.5 w-2.5 rounded-full ${
        ok ? "bg-emerald-500" : "bg-slate-300"
      }`}
      aria-label={ok ? `${label}: загружен` : `${label}: не загружен`}
    />
  );
}

function SortableHead({
  columnId,
  active,
  direction,
  onSort,
  className,
}: {
  columnId: CampaignTableColumnId;
  active: boolean;
  direction: "asc" | "desc";
  onSort: (id: CampaignTableColumnId) => void;
  className?: string;
}) {
  const def = getColumnDef(columnId);
  const hint = active
    ? direction === "asc"
      ? def.sortHintAsc
      : def.sortHintDesc
    : `${def.sortHintAsc} / ${def.sortHintDesc}`;

  return (
    <TableHead className={cn("h-8 p-0", className)}>
      <button
        type="button"
        onClick={() => onSort(columnId)}
        title={`Сортировка: ${hint}`}
        className={cn(
          "flex h-8 w-full items-center gap-1 px-2 text-[11px] font-medium transition-colors hover:text-slate-800",
          def.align === "right" ? "justify-end" : "",
          def.align === "center" ? "justify-center" : "",
          active ? "text-slate-900" : "text-slate-500"
        )}
      >
        <span>{def.label}</span>
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="h-3 w-3 shrink-0" />
          ) : (
            <ArrowDown className="h-3 w-3 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 shrink-0 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

function renderCell(columnId: CampaignTableColumnId, row: CampaignSummary) {
  const m = row.metrics;
  const tone =
    row.status === "on_track"
      ? "success"
      : row.status === "attention"
        ? "warning"
        : row.status === "critical"
          ? "danger"
          : "default";
  const cur = row.campaign.currency;

  switch (columnId) {
    case "campaign":
      return (
        <TableCell key={columnId} className="py-2 font-medium">
          <Link
            href={`/campaigns/${row.campaign.id}`}
            className="text-slate-900 hover:underline"
          >
            {row.campaign.name}
          </Link>
          <div className="mt-0.5 text-[10px] text-slate-500">
            Primary: {KPI_LABELS[row.primaryKpi]}
          </div>
          {row.missingDays > 0 && row.status !== "completed" ? (
            <div className="mt-0.5 text-[10px] text-amber-600">
              Missing: {row.missingDays}d
            </div>
          ) : null}
        </TableCell>
      );
    case "client":
      return (
        <TableCell key={columnId} className="py-2 text-slate-600">
          {row.campaign.client.name}
        </TableCell>
      );
    case "brand":
      return (
        <TableCell key={columnId} className="py-2 text-slate-600">
          {brandDisplayName(row.campaign.brand)}
        </TableCell>
      );
    case "platform":
      return (
        <TableCell key={columnId} className="py-2 text-slate-600">
          {row.campaign.platform.name}
        </TableCell>
      );
    case "period":
      return (
        <TableCell key={columnId} className="py-2 tabular-nums text-slate-600">
          {formatDisplayDate(row.campaign.start_date)}–
          {formatDisplayDate(row.campaign.end_date)}
        </TableCell>
      );
    case "days":
      return (
        <TableCell key={columnId} className="py-2 tabular-nums text-slate-600">
          {row.daysLabel}
        </TableCell>
      );
    case "impressions":
      return (
        <TableCell
          key={columnId}
          className="py-2 text-right tabular-nums text-slate-700"
        >
          {row.factByKpi.impressions != null
            ? formatNumber(row.factByKpi.impressions)
            : "—"}
        </TableCell>
      );
    case "reach":
      return (
        <TableCell
          key={columnId}
          className="py-2 text-right tabular-nums text-slate-700"
        >
          {row.factByKpi.reach != null ? formatNumber(row.factByKpi.reach) : "—"}
        </TableCell>
      );
    case "clicks":
      return (
        <TableCell
          key={columnId}
          className="py-2 text-right tabular-nums text-slate-700"
        >
          {row.factByKpi.clicks != null
            ? formatNumber(row.factByKpi.clicks)
            : "—"}
        </TableCell>
      );
    case "spend":
      return (
        <TableCell
          key={columnId}
          className="py-2 text-right tabular-nums text-slate-700"
        >
          {row.factByKpi.spend != null
            ? formatKpiValue("spend", row.factByKpi.spend, cur)
            : "—"}
        </TableCell>
      );
    case "progress":
      return (
        <TableCell key={columnId} className="min-w-[100px] py-2">
          <div className="space-y-1">
            <div className="text-[11px] tabular-nums text-slate-600">
              {formatPercent(m?.progress ?? null)}
            </div>
            <ProgressBar value={m?.progress ?? 0} tone={tone} />
          </div>
        </TableCell>
      );
    case "pacing":
      return (
        <TableCell
          key={columnId}
          className="py-2 text-right tabular-nums font-medium text-slate-800"
        >
          {formatPercent(m?.pacing ?? null, 0)}
        </TableCell>
      );
    case "launch":
      return (
        <TableCell key={columnId} className="py-2 text-center">
          <ScreenshotDot
            ok={row.screenshotStatus?.launch ?? false}
            label="Запуск"
          />
        </TableCell>
      );
    case "reporting":
      return (
        <TableCell key={columnId} className="py-2 text-center">
          <ScreenshotDot
            ok={row.screenshotStatus?.reporting ?? false}
            label="Отчётность"
          />
        </TableCell>
      );
    case "status":
      return (
        <TableCell key={columnId} className="py-2">
          <StatusBadge status={row.status} />
        </TableCell>
      );
    default:
      return null;
  }
}

export function CampaignTable({
  campaigns,
  compact = false,
}: {
  campaigns: CampaignSummary[];
  compact?: boolean;
}) {
  const user = useCurrentUser();
  const { prefs, setPrefs, setSort, sort } = useCampaignTablePrefs(user?.id);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const visibleColumns = useMemo(() => {
    const visible = new Set(prefs.visibleColumns);
    visible.add("campaign");
    return prefs.columnOrder.filter((id) => visible.has(id));
  }, [prefs.columnOrder, prefs.visibleColumns]);

  // Sort the full incoming set before any future pagination slices.
  const sortedCampaigns = useMemo(
    () => sortCampaignSummaries(campaigns, sort),
    [campaigns, sort]
  );

  function handleSort(columnId: CampaignTableColumnId) {
    setSort(toggleSortDirection(sort, columnId));
  }

  function handleSavePrefs(next: CampaignTablePrefs) {
    setPrefs(next);
  }

  const minWidth = Math.max(640, visibleColumns.length * 110);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setSettingsOpen(true)}
        >
          <Columns3 className="h-3.5 w-3.5" />
          Колонки
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <Table style={{ minWidth }}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {visibleColumns.map((id) => (
                <SortableHead
                  key={id}
                  columnId={id}
                  active={sort.column === id}
                  direction={sort.direction}
                  onSort={handleSort}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCampaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Math.max(1, visibleColumns.length)}
                  className="py-8 text-center text-sm text-slate-500"
                >
                  Кампании не найдены
                </TableCell>
              </TableRow>
            ) : (
              sortedCampaigns.map((row) => (
                <TableRow
                  key={row.campaign.id}
                  className={compact ? "text-xs" : "text-sm"}
                >
                  {visibleColumns.map((id) => renderCell(id, row))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CampaignTableColumnsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        prefs={prefs}
        onSave={handleSavePrefs}
      />
    </div>
  );
}

/** Sort helper for pages that paginate outside the table. */
export { sortCampaignSummaries };
