"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface SparklineChartProps {
  data: { date: string; views: number }[];
  height?: number;
  color?: string;
}

function SparklineTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div
      className="rounded-md px-2 py-1 text-xs shadow-lg"
      style={{
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(34,211,238,0.3)",
      }}
    >
      <span className="text-slate-400">{payload[0].payload.date}</span>
      <span className="ml-2 font-semibold text-brand-hover">
        {payload[0].value} views
      </span>
    </div>
  );
}

export function SparklineChart({
  data,
  height = 48,
  color = "#22D3EE",
}: SparklineChartProps) {
  const hasData = useMemo(() => data.some((d) => d.views > 0), [data]);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-600"
        style={{ height }}
      >
        No view data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={<SparklineTooltip />} />
        <Area
          type="monotone"
          dataKey="views"
          stroke={color}
          strokeWidth={1.5}
          fill="url(#sparkGrad)"
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
