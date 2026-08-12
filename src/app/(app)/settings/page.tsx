"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PACING_THRESHOLDS } from "@/lib/config/pacing";

export default function SettingsPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function resetSeed() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Ошибка");
        return;
      }
      setMessage(
        `Тестовые данные обновлены: ${data.clients} клиентов, ${data.campaigns} кампаний`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Конфигурация статусов и служебные действия
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

      <Card className="border-slate-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Данные</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Пересоздать локальные тестовые данные (Abbott, статусы On track / Attention /
            Critical / Completed).
          </p>
          <Button onClick={resetSeed} disabled={loading} variant="outline">
            {loading ? "Обновление..." : "Reset seed data"}
          </Button>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            Сейчас приложение работает на локальном JSON-хранилище (
            <code>data/store.json</code>).
          </p>
          <p>
            Для подключения Supabase: заполните <code>.env.local</code> по образцу{" "}
            <code>.env.example</code>, выполните SQL из{" "}
            <code>supabase/migrations/001_init.sql</code> и{" "}
            <code>supabase/seed.sql</code>, затем установите{" "}
            <code>USE_LOCAL_DB=false</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
