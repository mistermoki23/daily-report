"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import {
  formatDisplayDate,
  formatKpiValue,
  formatNumber,
  formatPercent,
} from "@/lib/calculations";
import type { CampaignSummary } from "@/lib/types";

export function CampaignTable({
  campaigns,
  compact = false,
}: {
  campaigns: CampaignSummary[];
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <Table className="min-w-[1200px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 text-[11px] font-medium text-slate-500">Campaign</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500">Client</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500">Platform</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500">Period</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500">Days</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500 text-right">Impressions</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500 text-right">Reach</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500 text-right">Clicks</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500 text-right">Spend</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500">Progress</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500 text-right">Pacing</TableHead>
            <TableHead className="h-8 text-[11px] font-medium text-slate-500">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="py-8 text-center text-sm text-slate-500">
                Кампании не найдены
              </TableCell>
            </TableRow>
          ) : (
            campaigns.map((row) => {
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
              return (
                <TableRow key={row.campaign.id} className={compact ? "text-xs" : "text-sm"}>
                  <TableCell className="py-2 font-medium">
                    <Link
                      href={`/campaigns/${row.campaign.id}`}
                      className="text-slate-900 hover:underline"
                    >
                      {row.campaign.name}
                    </Link>
                    {row.missingDays > 0 && row.status !== "completed" ? (
                      <div className="mt-0.5 text-[10px] text-amber-600">
                        Missing: {row.missingDays}d
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-2 text-slate-600">{row.campaign.client.name}</TableCell>
                  <TableCell className="py-2 text-slate-600">{row.campaign.platform.name}</TableCell>
                  <TableCell className="py-2 tabular-nums text-slate-600">
                    {formatDisplayDate(row.campaign.start_date)}–{formatDisplayDate(row.campaign.end_date)}
                  </TableCell>
                  <TableCell className="py-2 tabular-nums text-slate-600">{row.daysLabel}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums text-slate-700">
                    {row.factByKpi.impressions != null
                      ? formatNumber(row.factByKpi.impressions)
                      : "—"}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums text-slate-700">
                    {row.factByKpi.reach != null ? formatNumber(row.factByKpi.reach) : "—"}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums text-slate-700">
                    {row.factByKpi.clicks != null ? formatNumber(row.factByKpi.clicks) : "—"}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums text-slate-700">
                    {row.factByKpi.spend != null
                      ? formatKpiValue("spend", row.factByKpi.spend, cur)
                      : "—"}
                  </TableCell>
                  <TableCell className="min-w-[100px] py-2">
                    <div className="space-y-1">
                      <div className="text-[11px] tabular-nums text-slate-600">
                        {formatPercent(m?.progress ?? null)}
                      </div>
                      <ProgressBar value={m?.progress ?? 0} tone={tone} />
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums font-medium text-slate-800">
                    {formatPercent(m?.pacing ?? null, 0)}
                  </TableCell>
                  <TableCell className="py-2">
                    <StatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
