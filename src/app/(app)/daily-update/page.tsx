"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DailyUpdateCenter } from "@/components/DailyUpdateCenter";
import type { DailyUpdateItem } from "@/lib/types";

export default function DailyUpdatePage() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<DailyUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      const daily = data?.dailyUpdate;
      setCount(Number(daily?.count) || 0);
      setItems(Array.isArray(daily?.items) ? daily.items : []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Daily Update</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Задачи по внесению фактических данных за предыдущий день
        </p>
      </div>
      {loading ? (
        <div className="text-sm text-slate-500">Загрузка...</div>
      ) : (
        <DailyUpdateCenter count={count} items={items} />
      )}
      <p className="text-xs text-slate-400">
        После заполнения вернитесь на{" "}
        <Link href="/dashboard" className="underline">
          Dashboard
        </Link>
        .
      </p>
    </div>
  );
}
