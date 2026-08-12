"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/calculations";
import type { ChartPoint } from "@/lib/types";

export function CampaignChart({
  data,
  title = "Plan vs Fact",
  mode = "daily",
  subtitle,
}: {
  data: ChartPoint[];
  title?: string;
  /** daily = Daily Plan vs Daily Fact; cumulative = expected vs actual cumulative */
  mode?: "daily" | "cumulative";
  subtitle?: string;
}) {
  const planKey = mode === "daily" ? "dailyPlan" : "expectedCumulative";
  const factKey = mode === "daily" ? "dailyFact" : "actualCumulative";
  const planName = mode === "daily" ? "Daily Plan" : "Expected cumulative";
  const factName = mode === "daily" ? "Daily Fact" : "Actual cumulative";

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="px-4 pb-2 pt-3">
        <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>
        <p className="text-xs text-slate-500">
          {subtitle ??
            (mode === "daily"
              ? "Daily Plan vs Daily Fact"
              : "Cumulative expected vs actual")}
        </p>
      </CardHeader>
      <CardContent className="px-2 pb-3 pt-0">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(v) => formatNumber(Number(v))}
                width={70}
              />
              <Tooltip
                formatter={(value) =>
                  value == null ? "—" : formatNumber(Number(value), 2)
                }
                contentStyle={{
                  borderRadius: 8,
                  borderColor: "#e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {data.some((d) => d[planKey as keyof ChartPoint] != null) ? (
                <Line
                  type="monotone"
                  dataKey={planKey}
                  name={planName}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              ) : null}
              <Line
                type="monotone"
                dataKey={factKey}
                name={factName}
                stroke="#0f172a"
                strokeWidth={2}
                connectNulls
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
