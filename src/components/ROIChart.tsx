"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { School } from "@/lib/data/schema";

interface ROIChartProps {
  schools: School[];
}

export default function ROIChart({ schools }: ROIChartProps) {
  const data = schools
    .filter((s) => s.medianEarnings6yr && typeof s.medianEarnings6yr === "number")
    .slice(0, 15)
    .map((s) => ({
      name:
        typeof s.name === "string"
          ? s.name.length > 20
            ? s.name.slice(0, 20) + "..."
            : s.name
          : "Unknown",
      tuition: typeof s.tuitionInState === "number" ? s.tuitionInState : 0,
      earnings: typeof s.medianEarnings6yr === "number" ? s.medianEarnings6yr : 0,
    }));

  if (data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-mantle rounded-lg border border-surface0">
        <div className="text-center text-subtext0">
          <p className="text-lg font-bold text-overlay0 mb-2">No Chart Data</p>
          <p className="text-sm">No data available for chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[480px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ctp-surface1)" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={100}
            tick={{ fontSize: 10, fill: "var(--ctp-subtext0)" }}
          />
          <YAxis
            tick={{ fill: "var(--ctp-subtext0)" }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--ctp-mantle)",
              border: "1px solid var(--ctp-surface0)",
              color: "var(--ctp-text)",
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar dataKey="tuition" name="In-State Tuition" fill="var(--ctp-peach)" />
          <Bar dataKey="earnings" name="Median Earnings (6yr)" fill="var(--ctp-green)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
