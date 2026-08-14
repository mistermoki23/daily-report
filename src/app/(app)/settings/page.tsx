"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PACING_THRESHOLDS } from "@/lib/config/pacing";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Конфигурация статусов кампаний
        </p>
      </div>

      <Card className="border-slate-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Pacing thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            On track: pacing ≥ <strong>{PACING_THRESHOLDS.onTrack}%</strong>
          </p>
          <p>
            Attention: pacing ≥ <strong>{PACING_THRESHOLDS.attention}%</strong> и &lt;{" "}
            {PACING_THRESHOLDS.onTrack}%
          </p>
          <p>
            Critical: pacing &lt; <strong>{PACING_THRESHOLDS.attention}%</strong>
          </p>
          <p className="pt-2 text-xs text-slate-400">
            Пороги заданы в <code>src/lib/config/pacing.ts</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
