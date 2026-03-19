"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

import type { TrajectoryPoint } from "@/types/item-details";

interface MiniTrajectoryChartProps {
  itemId: string;
  accent: { color: string; name: string };
}

/**
 * MiniTrajectoryChart - Compact sparkline for ItemDetailPopup.
 * Shows position over time with trend indicator.
 */
export function MiniTrajectoryChart({ itemId, accent }: MiniTrajectoryChartProps) {
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;

    let cancelled = false;
    const fetchTrajectory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/items/${itemId}/activity?limit=20`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTrajectory(data.trajectory || []);
        }
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrajectory();
    return () => { cancelled = true; };
  }, [itemId]);

  const chartData = useMemo(() => {
    if (!trajectory || trajectory.length < 2) return null;

    const positions = trajectory.map((p) => p.position + 1);
    const minP = Math.min(...positions);
    const maxP = Math.max(...positions);
    const range = Math.max(maxP - minP, 1);

    const width = 120;
    const height = 24;
    const pad = 3;

    const xStep = (width - pad * 2) / (positions.length - 1);

    const pathPoints = positions.map((pos, i) => {
      const x = pad + i * xStep;
      const y = pad + ((pos - minP) / range) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    });

    const trend = positions[positions.length - 1] - positions[0];

    return { path: pathPoints.join(" "), trend, width, height, lastPos: positions[positions.length - 1] };
  }, [trajectory]);

  if (loading) {
    return (
      <div className="h-8 w-full rounded bg-white/5 animate-pulse" />
    );
  }

  if (!chartData) return null;

  const trendColor =
    chartData.trend < 0 ? "#10B981" : chartData.trend > 0 ? "#EF4444" : accent.color;

  const TrendIcon =
    chartData.trend < 0 ? TrendingUp : chartData.trend > 0 ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
      style={{
        background: `${trendColor}08`,
        border: `1px solid ${trendColor}15`,
      }}
    >
      <TrendIcon className="w-3 h-3 shrink-0" style={{ color: trendColor }} />
      <svg
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="flex-1 h-6"
        preserveAspectRatio="none"
      >
        <path
          d={chartData.path}
          fill="none"
          stroke={trendColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="text-2xs font-bold shrink-0"
        style={{ color: trendColor }}
      >
        #{chartData.lastPos}
      </span>
    </motion.div>
  );
}

export default MiniTrajectoryChart;
