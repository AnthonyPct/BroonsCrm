"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RED = "#D81E34";
const GRID = "#F0EDE7";
const INK_MUTED = "#9C958D";

export function RegistrationsChart({
  data,
}: {
  data: { week: string; cumul: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="regFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RED} stopOpacity={0.16} />
            <stop offset="100%" stopColor={RED} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: INK_MUTED, fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: INK_MUTED, fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            border: "1px solid #E7E2D9",
            fontSize: 13,
            boxShadow: "0 8px 22px rgba(0,0,0,.07)",
          }}
          formatter={(value) => [`${value} licences`, "Cumul"]}
        />
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="cumul"
          stroke={RED}
          strokeWidth={2.5}
          fill="url(#regFill)"
          dot={{ r: 3.5, fill: "#fff", stroke: RED, strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
