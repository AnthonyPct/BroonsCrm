"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { eur } from "@/lib/format";

const NAVY = "#41598c";
const GRID = "#e4e7ee";
const INK_MUTED = "#6b7280";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e4e7ee",
  fontSize: 13,
  boxShadow: "0 4px 12px rgba(15,23,42,.08)",
};

export function CategoryBarChart({
  data,
}: {
  data: { category: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 12, fill: INK_MUTED }}
          tickLine={false}
          axisLine={false}
          interval={0}
          tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 13) + "…" : v)}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: INK_MUTED }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(65,89,140,.08)" }}
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value} licence(s)`, "Licences"]}
        />
        <Bar
          isAnimationActive={false}
          dataKey="count"
          fill={NAVY}
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PaymentSourceBarChart({
  data,
}: {
  data: { source: string; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 24, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: INK_MUTED }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v} €`}
        />
        <YAxis
          type="category"
          dataKey="source"
          width={110}
          tick={{ fontSize: 12, fill: INK_MUTED }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(65,89,140,.08)" }}
          contentStyle={tooltipStyle}
          formatter={(value) => [eur.format(Number(value)), "Encaissé"]}
        />
        <Bar
          isAnimationActive={false}
          dataKey="total"
          fill={NAVY}
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RegistrationsLineChart({
  data,
}: {
  data: { week: string; cumul: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 12, fill: INK_MUTED }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: INK_MUTED }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value} licences`, "Cumul"]}
        />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="cumul"
          stroke={NAVY}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
