"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatYesterdayLabel } from "@/lib/format";
import type { DailyUpdateItem } from "@/lib/types";

export function DailyUpdateCenter({
  count,
  items,
  compact = false,
}: {
  count: number;
  items: DailyUpdateItem[];
  compact?: boolean;
}) {
  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="px-4 pb-2 pt-3">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Daily Update
        </CardTitle>
        <p className="text-sm text-slate-700">
          Сегодня необходимо внести данные:{" "}
          <span className="font-semibold text-slate-900">
            {count} {count === 1 ? "кампания" : "кампаний"}
          </span>
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {items.length === 0 ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-4 text-sm text-emerald-800">
            Все данные за вчера внесены
          </div>
        ) : (
          <div className={compact ? "space-y-2" : "space-y-2"}>
            {items.map((item) => (
              <div
                key={item.campaignId}
                className="flex items-center justify-between gap-3 rounded-md border border-amber-200/80 bg-amber-50/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {item.campaignName}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span>{item.clientName}</span>
                    <span>·</span>
                    <span>{item.platformName}</span>
                    <span>·</span>
                    <span className="tabular-nums">
                      {formatYesterdayLabel(item.yesterday)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Missing
                    </span>
                  </div>
                </div>
                <Link
                  href={`/campaigns/${item.campaignId}/daily`}
                  className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white hover:bg-slate-800"
                >
                  Fill data
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
