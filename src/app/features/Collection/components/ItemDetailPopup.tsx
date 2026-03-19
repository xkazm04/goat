"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, useDragControls } from "framer-motion";
import {
  X,
  GripHorizontal,
  Lock,
  Unlock,
  Plus,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { BarShapeProps } from "recharts";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/animations/motion-presets";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { GoatBrokenFrame } from "@/components/illustrations/EmptyStateIllustrations";
import { useItemPopupStore, PopupInstance } from "@/stores/item-popup-store";
import type { ItemDetailResponse } from "@/types/item-details";
import { DURATION } from '@/lib/animations/motion-presets';

interface ItemDetailPopupProps {
  popup: PopupInstance;
  onQuickAssign?: (itemId: string) => void;
}

// Accent color based on ranking position
const getAccentColor = (medianPosition?: number) => {
  if (!medianPosition) return { color: '#22d3ee', name: 'cyan' };
  if (medianPosition <= 1) return { color: '#FFD700', name: 'gold' };
  if (medianPosition <= 2) return { color: '#C0C0C0', name: 'silver' };
  if (medianPosition <= 3) return { color: '#CD7F32', name: 'bronze' };
  if (medianPosition <= 10) return { color: '#3B82F6', name: 'blue' };
  return { color: '#22d3ee', name: 'cyan' };
};

/**
 * ItemDetailPopup — Compact floating detail card for quick comparison.
 *
 * Features:
 * - Compact glassmorphism cards (~240px wide)
 * - Image as transparent background with hover opacity
 * - Lock to top row / unlock for free movement
 * - Ranking distribution chart with real data
 * - Quick-assign to grid
 */
export function ItemDetailPopup({ popup, onQuickAssign }: ItemDetailPopupProps) {
  const reducedMotion = useReducedMotion();
  const [data, setData] = useState<ItemDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { closePopup, bringToFront, toggleLock } = useItemPopupStore();
  const dragControls = useDragControls();

  // Accent color based on item's median ranking
  const accent = useMemo(() =>
    getAccentColor(data?.rankingStats?.medianPosition),
    [data?.rankingStats?.medianPosition]
  );

  // Fetch item details
  useEffect(() => {
    if (!popup.itemId) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/items/${popup.itemId}/details`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Item not found' : 'Failed to load');
        }
        setData(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [popup.itemId]);

  const handleClose = useCallback(() => closePopup(popup.id), [closePopup, popup.id]);
  const handleFocus = useCallback(() => bringToFront(popup.id), [bringToFront, popup.id]);
  const handleToggleLock = useCallback(() => toggleLock(popup.id), [toggleLock, popup.id]);

  const handleQuickAssign = useCallback(() => {
    if (onQuickAssign) {
      onQuickAssign(popup.itemId);
      handleClose();
    }
  }, [onQuickAssign, popup.itemId, handleClose]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const imageUrl = data?.item.image_url;

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 20 }}
      transition={SPRING.smooth}
      drag={!popup.locked}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => { setIsDragging(true); bringToFront(popup.id); }}
      onDragEnd={() => setIsDragging(false)}
      onMouseDown={handleFocus}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        left: popup.position.x,
        top: popup.position.y,
        zIndex: popup.zIndex,
      }}
      className={cn(
        "w-[240px] rounded-container overflow-hidden",
        "flex flex-col",
        isDragging && "cursor-grabbing",
        popup.locked && "transition-all duration-300"
      )}
    >
      {/* Outer glow effect */}
      <motion.div
        className="absolute -inset-px rounded-container pointer-events-none"
        animate={{
          boxShadow: isHovered
            ? `0 0 30px ${accent.color}25, 0 0 15px ${accent.color}15, 0 15px 30px rgba(0,0,0,0.5)`
            : `0 0 20px ${accent.color}10, 0 10px 25px rgba(0,0,0,0.4)`,
        }}
        transition={{ duration: DURATION.normal }}
      />

      {/* Background image — next/image fills the card */}
      {imageUrl && (
        <div
          className="absolute inset-0 rounded-container overflow-hidden pointer-events-none transition-opacity duration-500"
          style={{ opacity: isHovered ? 0.7 : 0.5 }}
        >
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="240px"
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Glass tint for readability */}
      <div
        className="absolute inset-0 rounded-container pointer-events-none"
        style={{
          background: `linear-gradient(180deg, rgba(15,23,42,0.7) 0%, rgba(15,23,42,0.85) 100%)`,
          boxShadow: `inset 0 0 30px ${accent.color}06`,
        }}
      />

      {/* Gradient border */}
      <div
        className="absolute inset-0 rounded-container pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${accent.color}35, transparent 50%, ${accent.color}15)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />

      {/* Content wrapper */}
      <div className="relative flex flex-col">
        {/* Header: drag handle + lock + close */}
        <div
          onPointerDown={(e) => {
            if (!popup.locked) dragControls.start(e);
          }}
          className={cn(
            "flex items-center justify-between px-2 py-1.5",
            "border-b border-white/5",
            !popup.locked && "cursor-grab active:cursor-grabbing",
            "select-none"
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {!popup.locked && <GripHorizontal className="w-3 h-3 text-slate-600 shrink-0" />}
            {popup.locked && (
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: accent.color }}
              />
            )}
            <span className="text-2xs font-medium text-slate-400 truncate font-grotesk">
              {loading ? 'Loading...' : data?.item.title || 'Details'}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            {/* Lock/Unlock button */}
            <button
              onClick={handleToggleLock}
              className={cn(
                "p-1 rounded-control transition-colors",
                popup.locked
                  ? "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                  : "text-slate-500 hover:text-white hover:bg-white/10"
              )}
              title={popup.locked ? 'Unlock (free movement)' : 'Lock to top row'}
            >
              {popup.locked
                ? <Lock className="w-3 h-3" />
                : <Unlock className="w-3 h-3" />
              }
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-control text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="overflow-y-auto max-h-[50vh]">
          {loading && <CompactLoadingSkeleton accent={accent.color} />}

          {error && (
            <div className="p-4 flex flex-col items-center text-center">
              <GoatBrokenFrame width={80} height={64} />
              <p className="text-2xs text-slate-400 mt-1">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Promoted stat numbers */}
              <CompactHero
                stats={data.rankingStats}
                accent={accent}
                onQuickAssign={onQuickAssign ? handleQuickAssign : undefined}
              />

              {/* Distribution chart */}
              {data.rankingStats && (
                <div className="px-2 pb-2">
                  <CompactRankingChart stats={data.rankingStats} accent={accent} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Compact sub-components
// ============================================================================

function CompactLoadingSkeleton({ accent }: { accent: string }) {
  return (
    <div className="p-2 space-y-2">
      <div
        className="w-full h-16 rounded-card animate-pulse"
        style={{ background: `linear-gradient(135deg, ${accent}10, ${accent}05)` }}
      />
      <div className="h-14 rounded-card bg-white/5 animate-pulse" />
    </div>
  );
}

interface CompactHeroProps {
  stats: ItemDetailResponse['rankingStats'];
  accent: { color: string; name: string };
  onQuickAssign?: () => void;
}

function CompactHero({ stats, accent, onQuickAssign }: CompactHeroProps) {
  const totalRankings = stats?.totalRankings ?? 0;
  const avgPosition = stats?.averagePosition ?? 0;

  return (
    <div className="px-2 pt-2.5 pb-2">
      {/* Large stat numbers */}
      <div className="flex items-stretch gap-2">
        {/* Rankings count */}
        <div className="flex-1 text-center py-1.5 rounded-card bg-white/[0.03] border border-white/[0.06]">
          <p
            className="text-2xl font-black tabular-nums leading-none font-heading"
            style={{ color: accent.color }}
          >
            {totalRankings}
          </p>
          <p className="text-3xs text-slate-500 uppercase tracking-wider mt-1 font-mono">rankings</p>
        </div>

        {/* Average position */}
        <div className="flex-1 text-center py-1.5 rounded-card bg-white/[0.03] border border-white/[0.06]">
          <p className="text-2xl font-black tabular-nums leading-none text-white/90 font-heading">
            {avgPosition > 0 ? `#${avgPosition.toFixed(1)}` : '--'}
          </p>
          <p className="text-3xs text-slate-500 uppercase tracking-wider mt-1 font-mono">avg rank</p>
        </div>
      </div>

      {/* Quick assign */}
      {onQuickAssign && (
        <button
          onClick={onQuickAssign}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1 rounded-control text-2xs font-bold uppercase tracking-wide transition-all hover:brightness-110"
          style={{
            background: `linear-gradient(135deg, ${accent.color}, ${accent.color}cc)`,
            color: '#000',
          }}
        >
          <Plus className="w-3 h-3" />
          Add to Grid
        </button>
      )}
    </div>
  );
}

interface CompactRankingChartProps {
  stats: NonNullable<ItemDetailResponse['rankingStats']>;
  accent: { color: string; name: string };
}

function BrandedBarShape({ x, y, width, height, gradientId }: {
  x?: number; y?: number; width?: number; height?: number;
  gradientId?: string;
}) {
  if (!x || !y || !width || !height || height <= 0) return null;
  const r = Math.min(3, width / 2, height);
  return (
    <path
      d={`M${x},${y + height}
          V${y + r}
          Q${x},${y} ${x + r},${y}
          H${x + width - r}
          Q${x + width},${y} ${x + width},${y + r}
          V${y + height}Z`}
      fill={gradientId ? `url(#${gradientId})` : undefined}
    />
  );
}

function CompactRankingChart({ stats, accent }: CompactRankingChartProps) {
  const chartData = useMemo(() => {
    return Object.keys(stats.distribution || {})
      .map(Number)
      .sort((a, b) => a - b)
      .map(pos => ({
        position: pos,
        count: stats.distribution[pos] || 0,
        isMedian: pos === Math.round(stats.medianPosition),
      }));
  }, [stats]);

  const volatilityInfo = getVolatilityInfo(stats.volatility);
  const gradientId = `compact-bar-${accent.name}`;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-2.5 h-2.5 text-slate-500" />
          <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Distribution</span>
        </div>
        <span
          className="text-3xs font-medium px-1 py-px rounded"
          style={{
            background: volatilityInfo.bgColor,
            color: volatilityInfo.color,
          }}
        >
          {volatilityInfo.label}
        </span>
      </div>

      {/* Percentile row */}
      <div
        className="flex items-center justify-between px-1.5 py-1 rounded-control text-center"
        style={{ background: `${accent.color}06`, border: `1px solid ${accent.color}12` }}
      >
        <PercentileItem label="25th" value={stats.percentiles.p25} />
        <div className="h-3 w-px bg-white/8" />
        <PercentileItem label="Med" value={stats.percentiles.p50} highlight color={accent.color} />
        <div className="h-3 w-px bg-white/8" />
        <PercentileItem label="75th" value={stats.percentiles.p75} />
      </div>

      {/* Mini Chart */}
      {chartData.length > 0 && (
        <div className="h-14 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 10 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={accent.color} stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id={`${gradientId}-dim`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent.color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={accent.color} stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="position"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8, fontFamily: 'var(--font-family-mono)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<MiniTooltip accent={accent.color} />}
                cursor={{ fill: `${accent.color}10` }}
              />
              <ReferenceLine
                x={Math.round(stats.medianPosition)}
                stroke={accent.color}
                strokeDasharray="2 2"
                strokeWidth={1}
              />
              <Bar
                dataKey="count"
                maxBarSize={10}
                shape={(props: BarShapeProps) => (
                  <BrandedBarShape
                    x={props.x} y={props.y} width={props.width} height={props.height}
                    gradientId={(props as BarShapeProps & { isMedian?: boolean }).isMedian ? gradientId : `${gradientId}-dim`}
                  />
                )}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isMedian ? accent.color : `${accent.color}40`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function PercentileItem({
  label,
  value,
  highlight,
  color
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div className="text-center px-1.5">
      <p className="text-3xs text-slate-500 uppercase font-mono">{label}</p>
      <p
        className={cn("text-2xs font-bold", highlight ? "" : "text-slate-300")}
        style={highlight && color ? { color } : {}}
      >
        #{value}
      </p>
    </div>
  );
}

function MiniTooltip({ active, payload, label, accent }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string | number;
  accent: string;
}) {
  if (!active || !payload?.[0]) return null;
  return (
    <div
      className="px-1.5 py-0.5 rounded shadow-lg text-2xs"
      style={{
        background: 'rgba(15,23,42,0.95)',
        border: `1px solid ${accent}40`,
      }}
    >
      <span className="text-slate-400">#{label}:</span>{' '}
      <span className="font-bold" style={{ color: accent }}>{payload[0].value}</span>
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function getVolatilityInfo(volatility: number) {
  if (volatility < 2) return { label: 'Stable', color: '#10B981', bgColor: 'rgba(16,185,129,0.15)' };
  if (volatility < 4) return { label: 'Moderate', color: '#22d3ee', bgColor: 'rgba(34,211,238,0.15)' };
  if (volatility < 6) return { label: 'Contested', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)' };
  return { label: 'Polarizing', color: '#EF4444', bgColor: 'rgba(239,68,68,0.15)' };
}

export default ItemDetailPopup;
