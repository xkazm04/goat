"use client";

/**
 * TierSection Component
 * Collapsible section with tier-aware styling and statistics
 */

import { memo, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { SimpleDropZone } from "../../sub_MatchCollections/SimpleDropZone";
import { GridItemType } from "@/types/match";
import { TierDefinition, TierId, getTierCSSProperties } from "../lib/tierConfig";

interface TierSectionProps {
  /** Tier configuration */
  tier: TierDefinition;
  /** Grid items for this tier */
  items: Array<{ position: number; item: GridItemType | null }>;
  /** Whether the section is collapsed */
  isCollapsed: boolean;
  /** Toggle collapsed state */
  onToggleCollapsed: () => void;
  /** Remove handler */
  onRemove: (position: number) => void;
  /** Get item title */
  getItemTitle: (item: any) => string;
  /** Current breakpoint for responsive columns */
  breakpoint?: "sm" | "md" | "lg" | "xl";
  /** Stats for this tier */
  stats?: {
    filledSlots: number;
    totalSlots: number;
    fillPercentage: number;
  };
}

/**
 * Progress bar for tier fill status
 */
const TierProgressBar = memo(function TierProgressBar({
  percentage,
  accentColor,
}: {
  percentage: number;
  accentColor: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: accentColor }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] text-white/40 tabular-nums w-8 text-right">
        {Math.round(percentage)}%
      </span>
    </div>
  );
});

/**
 * Tier header with collapse toggle and stats
 */
const TierHeader = memo(function TierHeader({
  tier,
  isCollapsed,
  onToggle,
  stats,
}: {
  tier: TierDefinition;
  isCollapsed: boolean;
  onToggle: () => void;
  stats?: {
    filledSlots: number;
    totalSlots: number;
    fillPercentage: number;
  };
}) {
  const canCollapse = tier.layout.collapsible;

  return (
    <div className="flex items-center gap-4 mb-4">
      {/* Left gradient line */}
      <div
        className="h-[1px] flex-1"
        style={{
          background: `linear-gradient(to right, transparent, ${tier.style.accentColor}20)`,
        }}
      />

      {/* Title and controls */}
      <button
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
          canCollapse ? "hover:bg-white/5 cursor-pointer" : "cursor-default"
        }`}
        onClick={canCollapse ? onToggle : undefined}
        disabled={!canCollapse}
      >
        {/* Tier icon/badge */}
        <motion.div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${tier.style.accentColor}40, ${tier.style.accentColor}20)`,
            boxShadow: `0 0 10px ${tier.style.glowColor}`,
          }}
          whileHover={canCollapse ? { scale: 1.1 } : {}}
        >
          <Sparkles className="w-3 h-3" style={{ color: tier.style.accentColor }} />
        </motion.div>

        {/* Title */}
        <h3
          className="text-sm font-bold tracking-wider uppercase"
          style={{ color: tier.style.accentColor }}
        >
          {tier.displayName}
        </h3>

        {/* Stats badge */}
        {stats && (
          <span className="text-[10px] text-white/40 ml-1">
            {stats.filledSlots}/{stats.totalSlots}
          </span>
        )}

        {/* Collapse icon */}
        {canCollapse && (
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-white/40" />
          </motion.div>
        )}
      </button>

      {/* Progress bar */}
      {stats && !isCollapsed && (
        <TierProgressBar
          percentage={stats.fillPercentage}
          accentColor={tier.style.accentColor}
        />
      )}

      {/* Right gradient line */}
      <div
        className="h-[1px] flex-1"
        style={{
          background: `linear-gradient(to left, transparent, ${tier.style.accentColor}20)`,
        }}
      />
    </div>
  );
});

/**
 * Collapsed tier preview showing filled item thumbnails
 */
const CollapsedPreview = memo(function CollapsedPreview({
  tier,
  items,
  onExpand,
}: {
  tier: TierDefinition;
  items: Array<{ position: number; item: GridItemType | null }>;
  onExpand: () => void;
}) {
  const filledItems = items.filter((i) => i.item?.matched);

  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer"
      style={{
        background: `linear-gradient(90deg, ${tier.style.accentColor}10, transparent)`,
        border: `1px solid ${tier.style.accentColor}20`,
      }}
      onClick={onExpand}
      whileHover={{ scale: 1.01, backgroundColor: `${tier.style.accentColor}15` }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Thumbnails */}
      <div className="flex -space-x-2">
        {filledItems.slice(0, 5).map(({ position, item }) => (
          <motion.div
            key={position}
            className="w-8 h-8 rounded-md border-2 overflow-hidden"
            style={{
              borderColor: tier.style.accentColor,
              boxShadow: `0 0 8px ${tier.style.glowColor}`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: position * 0.05 }}
          >
            {item?.image_url ? (
              <img
                src={item.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ backgroundColor: tier.style.accentColor + "30" }}
              />
            )}
          </motion.div>
        ))}
        {filledItems.length > 5 && (
          <div
            className="w-8 h-8 rounded-md border-2 flex items-center justify-center text-[10px] font-bold"
            style={{
              borderColor: tier.style.accentColor,
              backgroundColor: tier.style.accentColor + "20",
              color: tier.style.accentColor,
            }}
          >
            +{filledItems.length - 5}
          </div>
        )}
      </div>

      {/* Expand hint */}
      <span className="text-xs text-white/40 ml-2">
        Click to expand ({filledItems.length} items)
      </span>

      <ChevronUp className="w-4 h-4 text-white/40 ml-auto" />
    </motion.div>
  );
});

/**
 * Main TierSection component
 */
export const TierSection = memo(function TierSection({
  tier,
  items,
  isCollapsed,
  onToggleCollapsed,
  onRemove,
  getItemTitle,
  breakpoint = "lg",
  stats,
}: TierSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Get columns for current breakpoint
  const columns = tier.layout.columns[breakpoint];
  const gap = tier.layout.gap;

  // CSS custom properties for tier theming
  const cssProperties = useMemo(() => getTierCSSProperties(tier), [tier]);

  return (
    <section
      ref={containerRef}
      className="relative"
      style={cssProperties as React.CSSProperties}
    >
      {/* Background glow effect */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl opacity-30"
        style={{
          background: `radial-gradient(ellipse at top, ${tier.style.glowColor}, transparent 70%)`,
        }}
      />

      {/* Header */}
      <TierHeader
        tier={tier}
        isCollapsed={isCollapsed}
        onToggle={onToggleCollapsed}
        stats={stats}
      />

      {/* Content */}
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CollapsedPreview
              tier={tier}
              items={items}
              onExpand={onToggleCollapsed}
            />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: `${gap * 4}px`,
              }}
            >
              <AnimatePresence>
                {items.map(({ position, item }, idx) => {
                  const isOccupied = item?.matched;

                  return (
                    <motion.div
                      key={position}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{
                        delay: idx * tier.animation.staggerDelay,
                        type: "spring",
                        stiffness: tier.animation.dropStiffness,
                        damping: tier.animation.dropDamping,
                      }}
                      whileHover={{ scale: tier.animation.hoverScale }}
                      style={{
                        transformOrigin: "center center",
                      }}
                    >
                      <SimpleDropZone
                        position={position}
                        isOccupied={!!isOccupied}
                        occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                        imageUrl={isOccupied ? item.image_url : undefined}
                        gridItem={isOccupied ? item : undefined}
                        onRemove={() => onRemove(position)}
                        // Pass tier styling
                        tierAccent={tier.style.accentColor}
                        tierGlow={tier.style.glowColor}
                        showBadge={tier.layout.showBadges}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
});

export default TierSection;
