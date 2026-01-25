"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  X,
  GripHorizontal,
  Calendar,
  Users,
  Target,
  Award,
  Eye,
  MousePointerClick,
  Hash,
  Plus,
  TrendingUp,
  Sparkles,
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
import { cn } from "@/lib/utils";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { useItemPopupStore, PopupInstance } from "@/stores/item-popup-store";
import type { ItemDetailResponse } from "@/types/item-details";

interface ItemDetailPopupProps {
  popup: PopupInstance;
  onQuickAssign?: (itemId: string) => void;
}

// Accent color based on ranking position
const getAccentColor = (medianPosition?: number) => {
  if (!medianPosition) return { color: '#22d3ee', name: 'cyan' }; // Default cyan
  if (medianPosition <= 1) return { color: '#FFD700', name: 'gold' };
  if (medianPosition <= 2) return { color: '#C0C0C0', name: 'silver' };
  if (medianPosition <= 3) return { color: '#CD7F32', name: 'bronze' };
  if (medianPosition <= 10) return { color: '#3B82F6', name: 'blue' };
  return { color: '#22d3ee', name: 'cyan' };
};

/**
 * ItemDetailPopup - Premium floating item detail popup
 *
 * Redesigned with grid item aesthetics:
 * - Glassmorphism with multi-layer effects
 * - Position-aware accent colors
 * - Compact, space-efficient layout
 * - Premium shadows and glows
 */
export function ItemDetailPopup({ popup, onQuickAssign }: ItemDetailPopupProps) {
  const [data, setData] = useState<ItemDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { closePopup, bringToFront } = useItemPopupStore();
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 30 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      drag
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
        "w-[340px] rounded-2xl overflow-hidden",
        "flex flex-col",
        isDragging && "cursor-grabbing"
      )}
    >
      {/* Outer glow effect */}
      <motion.div
        className="absolute -inset-[1px] rounded-2xl pointer-events-none"
        animate={{
          boxShadow: isHovered
            ? `0 0 50px ${accent.color}30, 0 0 25px ${accent.color}20, 0 25px 50px rgba(0,0,0,0.5)`
            : `0 0 30px ${accent.color}15, 0 20px 40px rgba(0,0,0,0.4)`,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Glass background */}
      <div
        className="absolute inset-0 rounded-2xl bg-gray-900/90 backdrop-blur-xl"
        style={{
          boxShadow: `inset 0 0 40px ${accent.color}08`,
        }}
      />

      {/* Gradient border */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${accent.color}40, transparent 50%, ${accent.color}20)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />

      {/* Content wrapper */}
      <div className="relative flex flex-col">
        {/* Draggable Header */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className={cn(
            "flex items-center justify-between px-3 py-2",
            "border-b border-white/5",
            "cursor-grab active:cursor-grabbing select-none"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripHorizontal className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-400 truncate">
              {loading ? 'Loading...' : data?.item.title || 'Details'}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="overflow-y-auto max-h-[70vh]">
          {loading && <LoadingSkeleton accent={accent.color} />}

          {error && (
            <div className="p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-2">
                <X className="w-5 h-5 text-rose-400" />
              </div>
              <p className="text-xs text-gray-400">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Hero Image with Overlays */}
              <HeroSection
                item={data.item}
                stats={data.rankingStats}
                accent={accent}
                onQuickAssign={onQuickAssign ? handleQuickAssign : undefined}
              />

              {/* Compact Stats Row */}
              <div className="px-3 py-2">
                <StatsRow item={data.item} stats={data.rankingStats} accent={accent} />
              </div>

              {/* Divider with gradient */}
              <div className="mx-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Metadata & Rankings */}
              <div className="p-3 space-y-3">
                <MetadataRow item={data.item} />
                {data.rankingStats && (
                  <RankingChart stats={data.rankingStats} accent={accent} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Sub-components with premium styling
// ============================================================================

function LoadingSkeleton({ accent }: { accent: string }) {
  return (
    <div className="p-3 space-y-3">
      <div
        className="w-full aspect-[16/10] rounded-xl animate-pulse"
        style={{ background: `linear-gradient(135deg, ${accent}10, ${accent}05)` }}
      />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-12 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="h-20 rounded-lg bg-white/5 animate-pulse" />
    </div>
  );
}

interface HeroSectionProps {
  item: ItemDetailResponse['item'];
  stats: ItemDetailResponse['rankingStats'];
  accent: { color: string; name: string };
  onQuickAssign?: () => void;
}

function HeroSection({ item, stats, accent, onQuickAssign }: HeroSectionProps) {
  const isPodium = stats && stats.medianPosition <= 3;

  return (
    <div className="relative m-3 rounded-xl overflow-hidden group">
      {/* Image */}
      <div className="aspect-[16/10] w-full bg-gray-800">
        <PlaceholderImage src={item.image_url} alt={item.title} seed={item.title} />
      </div>

      {/* Multi-layer gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at bottom, ${accent.color}20, transparent 70%)`,
        }}
      />

      {/* Position Badge - Premium Style */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-2 left-2"
        >
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg backdrop-blur-md",
              isPodium ? "border-2" : "border"
            )}
            style={{
              background: isPodium
                ? `linear-gradient(135deg, ${accent.color}30, ${accent.color}15)`
                : `${accent.color}20`,
              borderColor: `${accent.color}60`,
              boxShadow: isPodium
                ? `0 0 20px ${accent.color}40, inset 0 1px 0 ${accent.color}30`
                : `0 0 10px ${accent.color}20`,
            }}
          >
            {isPodium && <Sparkles className="w-3 h-3" style={{ color: accent.color }} />}
            <span
              className="text-xs font-black"
              style={{
                color: accent.color,
                textShadow: isPodium ? `0 0 10px ${accent.color}60` : 'none',
              }}
            >
              #{stats.medianPosition}
            </span>
            <span className="text-[9px] text-white/50 uppercase">median</span>
          </div>
        </motion.div>
      )}

      {/* Quick Add Button */}
      {onQuickAssign && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onQuickAssign}
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
          style={{
            background: `linear-gradient(135deg, ${accent.color}, ${accent.color}cc)`,
            color: '#000',
            boxShadow: `0 2px 10px ${accent.color}50`,
          }}
        >
          <Plus className="w-3 h-3" />
          Add
        </motion.button>
      )}

      {/* Title Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h4 className="text-sm font-bold text-white mb-0.5 drop-shadow-lg line-clamp-1">
          {item.title}
        </h4>
        <div className="flex items-center gap-1.5">
          {item.category && (
            <span
              className="px-1.5 py-0.5 text-[9px] rounded-md font-medium backdrop-blur-sm"
              style={{
                background: `${accent.color}25`,
                color: accent.color,
                border: `1px solid ${accent.color}30`,
              }}
            >
              {item.category}
            </span>
          )}
          {item.subcategory && (
            <span className="text-[9px] text-white/40">/ {item.subcategory}</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatsRowProps {
  item: ItemDetailResponse['item'];
  stats: ItemDetailResponse['rankingStats'];
  accent: { color: string; name: string };
}

function StatsRow({ item, stats, accent }: StatsRowProps) {
  const viewCount = item.view_count || 0;
  const selectionCount = item.selection_count || 0;

  return (
    <div className="grid grid-cols-4 gap-1.5">
      <StatCell
        icon={<Eye className="w-3 h-3" />}
        value={formatCompact(viewCount)}
        label="views"
        accent={accent.color}
      />
      <StatCell
        icon={<MousePointerClick className="w-3 h-3" />}
        value={formatCompact(selectionCount)}
        label="picks"
        accent={accent.color}
      />
      <StatCell
        icon={<Users className="w-3 h-3" />}
        value={stats ? formatCompact(stats.totalRankings) : '-'}
        label="ranked"
        accent={accent.color}
      />
      <StatCell
        icon={<Award className="w-3 h-3" />}
        value={stats ? `${Math.round(stats.confidence * 100)}%` : '-'}
        label="agree"
        accent={accent.color}
        highlight={!!(stats && stats.confidence > 0.7)}
      />
    </div>
  );
}

interface StatCellProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: string;
  highlight?: boolean;
}

function StatCell({ icon, value, label, accent, highlight }: StatCellProps) {
  return (
    <div
      className="flex flex-col items-center py-2 px-1 rounded-lg transition-colors"
      style={{
        background: highlight ? `${accent}15` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${highlight ? accent + '30' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      <div style={{ color: highlight ? accent : 'rgba(255,255,255,0.4)' }}>{icon}</div>
      <span className="text-xs font-bold text-white mt-0.5">{value}</span>
      <span className="text-[8px] text-gray-500 uppercase">{label}</span>
    </div>
  );
}

interface MetadataRowProps {
  item: ItemDetailResponse['item'];
}

function MetadataRow({ item }: MetadataRowProps) {
  const hasYear = item.item_year;
  const hasGroup = item.group_name;

  if (!hasYear && !hasGroup && !item.description) return null;

  return (
    <div className="space-y-2">
      {/* Year & Collection */}
      {(hasYear || hasGroup) && (
        <div className="flex gap-2">
          {hasYear && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5 flex-1">
              <Calendar className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-400">
                {item.item_year}{item.item_year_to && item.item_year_to !== item.item_year ? ` - ${item.item_year_to}` : ''}
              </span>
            </div>
          )}
          {hasGroup && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5 flex-1 min-w-0">
              <Hash className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="text-[10px] text-gray-400 truncate">{item.group_name}</span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {item.description && (
        <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2 px-1">
          {item.description}
        </p>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((tag, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 text-[8px] rounded bg-white/5 text-gray-500 border border-white/5"
            >
              {tag}
            </span>
          ))}
          {item.tags.length > 4 && (
            <span className="text-[8px] text-gray-600 px-1">+{item.tags.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface RankingChartProps {
  stats: NonNullable<ItemDetailResponse['rankingStats']>;
  accent: { color: string; name: string };
}

function RankingChart({ stats, accent }: RankingChartProps) {
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

  return (
    <div className="space-y-2">
      {/* Header with volatility badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-gray-500" />
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Distribution</span>
        </div>
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded"
          style={{
            background: volatilityInfo.bgColor,
            color: volatilityInfo.color,
          }}
        >
          {volatilityInfo.label}
        </span>
      </div>

      {/* Percentile Bar */}
      <div
        className="flex items-center justify-between px-2 py-1.5 rounded-lg"
        style={{ background: `${accent.color}08`, border: `1px solid ${accent.color}15` }}
      >
        <PercentileItem label="25th" value={stats.percentiles.p25} />
        <div className="h-4 w-px bg-white/10" />
        <PercentileItem label="Med" value={stats.percentiles.p50} highlight color={accent.color} />
        <div className="h-4 w-px bg-white/10" />
        <PercentileItem label="75th" value={stats.percentiles.p75} />
        <div className="h-4 w-px bg-white/10" />
        <PercentileItem label="Avg" value={stats.averagePosition.toFixed(1)} />
      </div>

      {/* Mini Chart */}
      {chartData.length > 0 && (
        <div className="h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <XAxis dataKey="position" hide />
              <Tooltip content={<MiniTooltip accent={accent.color} />} />
              <ReferenceLine
                x={Math.round(stats.medianPosition)}
                stroke={accent.color}
                strokeDasharray="2 2"
                strokeWidth={1}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={12}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isMedian ? accent.color : `${accent.color}50`}
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
    <div className="text-center px-2">
      <p className="text-[8px] text-gray-500 uppercase">{label}</p>
      <p
        className={cn("text-[11px] font-bold", highlight ? "" : "text-gray-300")}
        style={highlight && color ? { color } : {}}
      >
        #{value}
      </p>
    </div>
  );
}

function MiniTooltip({ active, payload, label, accent }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div
      className="px-2 py-1 rounded shadow-lg text-[10px]"
      style={{
        background: 'rgba(15,23,42,0.95)',
        border: `1px solid ${accent}40`,
      }}
    >
      <span className="text-gray-400">#{label}:</span>{' '}
      <span className="font-bold" style={{ color: accent }}>{payload[0].value}</span>
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function formatCompact(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getVolatilityInfo(volatility: number) {
  if (volatility < 2) return { label: 'Stable', color: '#10B981', bgColor: 'rgba(16,185,129,0.15)' };
  if (volatility < 4) return { label: 'Moderate', color: '#22d3ee', bgColor: 'rgba(34,211,238,0.15)' };
  if (volatility < 6) return { label: 'Contested', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)' };
  return { label: 'Polarizing', color: '#EF4444', bgColor: 'rgba(239,68,68,0.15)' };
}

export default ItemDetailPopup;
