"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TierDefinition, TierBoundary, TieredItem } from "../types";
import { TIER_ANIMATIONS } from "../constants";

/**
 * Tier Band Props
 */
interface TierBandProps {
  tier: TierDefinition;
  children: React.ReactNode;
  showLabel?: boolean;
  isCollapsed?: boolean;
  itemCount?: number;
  filledCount?: number;
  onToggleCollapse?: () => void;
}

/**
 * TierBand - Visual band wrapper for a tier section
 */
export const TierBand = memo(function TierBand({
  tier,
  children,
  showLabel = true,
  isCollapsed = false,
  itemCount,
  filledCount,
  onToggleCollapse,
}: TierBandProps) {
  return (
    <motion.div
      className="relative"
      {...TIER_ANIMATIONS.bandEnter}
      layout
    >
      {/* Tier background band */}
      <div
        className="absolute inset-0 rounded-xl opacity-10 pointer-events-none"
        style={{
          background: tier.color.gradient,
        }}
      />

      {/* Left tier label */}
      {showLabel && (
        <motion.div
          className="absolute -left-12 top-0 bottom-0 flex items-center justify-center"
          {...TIER_ANIMATIONS.labelEnter}
        >
          <button
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg transition-all"
            style={{
              background: tier.color.gradient,
              color: tier.color.text,
              boxShadow: tier.color.glow,
            }}
            onClick={onToggleCollapse}
            title={`${tier.displayName}: ${filledCount || 0}/${itemCount || 0} items`}
          >
            {tier.label}
          </button>
        </motion.div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.div
            className="relative z-10 py-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed indicator */}
      {isCollapsed && (
        <motion.div
          className="flex items-center justify-center py-2 cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onToggleCollapse}
        >
          <span
            className="text-xs font-medium px-3 py-1 rounded-full"
            style={{
              background: `${tier.color.primary}30`,
              color: tier.color.primary,
            }}
          >
            {filledCount} items collapsed
          </span>
        </motion.div>
      )}
    </motion.div>
  );
});

/**
 * Tier Separator Props
 */
interface TierSeparatorProps {
  boundary: TierBoundary;
  showLabel?: boolean;
  onDrag?: (newPosition: number) => void;
  isDraggable?: boolean;
}

/**
 * TierSeparator - Visual separator between tiers
 */
export const TierSeparator = memo(function TierSeparator({
  boundary,
  showLabel = true,
  onDrag,
  isDraggable = false,
}: TierSeparatorProps) {
  return (
    <motion.div
      className="relative flex items-center gap-3 my-2"
      {...TIER_ANIMATIONS.separatorEnter}
    >
      {/* Left label */}
      {showLabel && (
        <div className="flex items-center gap-1">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{
              background: boundary.tierAbove.color.gradient,
              color: boundary.tierAbove.color.text,
            }}
          >
            {boundary.tierAbove.label}
          </span>
          <span className="text-slate-500 text-xs">↓</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{
              background: boundary.tierBelow.color.gradient,
              color: boundary.tierBelow.color.text,
            }}
          >
            {boundary.tierBelow.label}
          </span>
        </div>
      )}

      {/* Separator line */}
      <div className="flex-1 relative h-[2px]">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${boundary.tierAbove.color.primary}60, ${boundary.tierBelow.color.primary}60)`,
          }}
        />

        {/* Draggable handle */}
        {isDraggable && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full cursor-ns-resize flex items-center justify-center"
            style={{
              background: "rgba(30, 41, 59, 0.9)",
              border: `2px solid ${boundary.tierBelow.color.primary}`,
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              className="w-3 h-3 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </motion.div>
        )}
      </div>

      {/* Position indicator */}
      <span className="text-xs text-slate-500 min-w-[40px] text-right">
        #{boundary.position}
      </span>
    </motion.div>
  );
});

/**
 * Tier Label Badge Props
 */
interface TierLabelBadgeProps {
  tier: TierDefinition;
  size?: "sm" | "md" | "lg";
  showGlow?: boolean;
}

/**
 * TierLabelBadge - Compact tier label badge
 */
export const TierLabelBadge = memo(function TierLabelBadge({
  tier,
  size = "md",
  showGlow = false,
}: TierLabelBadgeProps) {
  const sizeClasses = {
    sm: "w-5 h-5 text-xs",
    md: "w-7 h-7 text-sm",
    lg: "w-9 h-9 text-base",
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} rounded-md flex items-center justify-center font-bold`}
      style={{
        background: tier.color.gradient,
        color: tier.color.text,
        boxShadow: showGlow ? tier.color.glow : "none",
      }}
      whileHover={{ scale: 1.1 }}
      title={tier.displayName}
    >
      {tier.label}
    </motion.div>
  );
});

/**
 * Tier Progress Bar Props
 */
interface TierProgressBarProps {
  tiers: TierDefinition[];
  currentPosition: number;
  totalPositions: number;
  showLabels?: boolean;
}

/**
 * TierProgressBar - Visual progress bar showing tier distribution
 */
export const TierProgressBar = memo(function TierProgressBar({
  tiers,
  currentPosition,
  totalPositions,
  showLabels = true,
}: TierProgressBarProps) {
  const segments = useMemo(() => {
    return tiers.map((tier) => ({
      tier,
      width: ((tier.endPosition - tier.startPosition) / totalPositions) * 100,
      isActive:
        currentPosition >= tier.startPosition &&
        currentPosition < tier.endPosition,
    }));
  }, [tiers, currentPosition, totalPositions]);

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="flex h-3 rounded-full overflow-hidden">
        {segments.map(({ tier, width, isActive }) => (
          <motion.div
            key={tier.id}
            className="relative"
            style={{
              width: `${width}%`,
              background: tier.color.gradient,
              opacity: isActive ? 1 : 0.4,
            }}
            animate={{ opacity: isActive ? 1 : 0.4 }}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0"
                style={{ background: "rgba(255, 255, 255, 0.3)" }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex mt-1">
          {segments.map(({ tier, width }) => (
            <div
              key={tier.id}
              className="text-center"
              style={{ width: `${width}%` }}
            >
              <span
                className="text-[10px] font-bold"
                style={{ color: tier.color.primary }}
              >
                {tier.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Tier Distribution Chart Props
 */
interface TierDistributionChartProps {
  tiers: TierDefinition[];
  tieredItems: TieredItem[];
  height?: number;
  showLabels?: boolean;
  animate?: boolean;
}

/**
 * TierDistributionChart - Bar chart showing item distribution across tiers
 */
export const TierDistributionChart = memo(function TierDistributionChart({
  tiers,
  tieredItems,
  height = 60,
  showLabels = true,
  animate = true,
}: TierDistributionChartProps) {
  const distribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tier of tiers) {
      counts.set(tier.id, 0);
    }
    for (const item of tieredItems) {
      const current = counts.get(item.tier.id) || 0;
      counts.set(item.tier.id, current + 1);
    }

    const maxCount = Math.max(...Array.from(counts.values()), 1);

    return tiers.map((tier) => ({
      tier,
      count: counts.get(tier.id) || 0,
      height: ((counts.get(tier.id) || 0) / maxCount) * 100,
    }));
  }, [tiers, tieredItems]);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {distribution.map(({ tier, count, height: barHeight }, index) => (
        <div
          key={tier.id}
          className="flex-1 flex flex-col items-center justify-end"
        >
          {/* Bar */}
          <motion.div
            className="w-full rounded-t-sm min-h-[4px]"
            style={{
              background: tier.color.gradient,
            }}
            initial={animate ? { height: 0 } : { height: `${barHeight}%` }}
            animate={{ height: `${barHeight}%` }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          />

          {/* Label */}
          {showLabels && (
            <div className="mt-1 text-center">
              <span
                className="text-[10px] font-bold"
                style={{ color: tier.color.primary }}
              >
                {tier.label}
              </span>
              <span className="text-[8px] text-slate-500 block">{count}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

/**
 * Inline Tier Indicator Props
 */
interface InlineTierIndicatorProps {
  tier: TierDefinition;
  position: number;
  showPosition?: boolean;
}

/**
 * InlineTierIndicator - Small inline indicator for grid items
 */
export const InlineTierIndicator = memo(function InlineTierIndicator({
  tier,
  position,
  showPosition = true,
}: InlineTierIndicatorProps) {
  return (
    <div
      className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
      style={{
        background: `${tier.color.primary}90`,
        color: tier.color.text,
        backdropFilter: "blur(4px)",
      }}
    >
      {tier.label}
      {showPosition && (
        <span className="opacity-70">#{position + 1}</span>
      )}
    </div>
  );
});

/**
 * Tier Overview Card Props
 */
interface TierOverviewCardProps {
  tier: TierDefinition;
  itemCount: number;
  filledCount: number;
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * TierOverviewCard - Card showing tier summary
 */
export const TierOverviewCard = memo(function TierOverviewCard({
  tier,
  itemCount,
  filledCount,
  isSelected = false,
  onClick,
}: TierOverviewCardProps) {
  const fillPercentage = itemCount > 0 ? (filledCount / itemCount) * 100 : 0;

  return (
    <motion.button
      className="relative p-3 rounded-xl text-left transition-all w-full"
      style={{
        background: isSelected
          ? tier.color.gradient
          : `${tier.color.primary}15`,
        border: `2px solid ${isSelected ? tier.color.primary : "transparent"}`,
        boxShadow: isSelected ? tier.color.glow : "none",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {/* Tier label */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg"
          style={{
            background: isSelected ? "rgba(255,255,255,0.2)" : tier.color.gradient,
            color: isSelected ? tier.color.text : tier.color.text,
          }}
        >
          {tier.label}
        </span>
        <div>
          <div
            className="text-sm font-semibold"
            style={{ color: isSelected ? tier.color.text : tier.color.primary }}
          >
            {tier.displayName}
          </div>
          <div
            className="text-xs"
            style={{
              color: isSelected ? `${tier.color.text}99` : "rgba(148, 163, 184, 0.8)",
            }}
          >
            {filledCount}/{itemCount} items
          </div>
        </div>
      </div>

      {/* Fill progress */}
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: isSelected ? "rgba(255,255,255,0.2)" : "rgba(71, 85, 105, 0.3)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: isSelected ? "rgba(255,255,255,0.5)" : tier.color.gradient,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${fillPercentage}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
      </div>
    </motion.button>
  );
});

export default {
  TierBand,
  TierSeparator,
  TierLabelBadge,
  TierProgressBar,
  TierDistributionChart,
  InlineTierIndicator,
  TierOverviewCard,
};
