"use client";

/**
 * GridRenderer
 * Pure render component for grid layout and slots
 * Uses React.memo for fine-grained render optimization
 */

import React, { memo, useMemo, useCallback } from "react";
import { GridItemType } from "@/types/match";
import { ViewMode } from "./ViewSwitcher";
import { PodiumView } from "./PodiumView";
import { GoatView } from "./GoatView";
import { MountRushmoreView } from "./MountRushmoreView";
import { GridSection } from "./GridSection";
import { TierSection } from "./TierSection";
import { useTierLayout } from "../hooks/useTierLayout";
import { getItemTitle } from "../lib/helpers";

/**
 * GridRenderer props
 */
interface GridRendererProps {
  /** Grid items array */
  gridItems: GridItemType[];
  /** Current view mode */
  viewMode: ViewMode;
  /** Handler for item removal */
  onRemove: (position: number) => void;
  /** Maximum grid size */
  maxSize?: number;
  /** Whether to use tier-based layout */
  useTierLayout?: boolean;
  /** Whether to show tier headers */
  showTierHeaders?: boolean;
}

/**
 * Memoized view selector component
 */
const ViewSelector = memo(function ViewSelector({
  viewMode,
  gridItems,
  onRemove,
}: {
  viewMode: ViewMode;
  gridItems: GridItemType[];
  onRemove: (position: number) => void;
}) {
  switch (viewMode) {
    case "podium":
      return (
        <PodiumView
          gridItems={gridItems}
          onRemove={onRemove}
          getItemTitle={getItemTitle}
        />
      );
    case "goat":
      return (
        <GoatView
          gridItems={gridItems}
          onRemove={onRemove}
          getItemTitle={getItemTitle}
        />
      );
    case "rushmore":
      return (
        <MountRushmoreView
          gridItems={gridItems}
          onRemove={onRemove}
          getItemTitle={getItemTitle}
        />
      );
    default:
      return null;
  }
});

/**
 * Standard grid sections renderer
 */
const StandardGridSections = memo(function StandardGridSections({
  gridItems,
  viewMode,
  onRemove,
}: {
  gridItems: GridItemType[];
  viewMode: ViewMode;
  onRemove: (position: number) => void;
}) {
  const startOffset = viewMode === "rushmore" ? 4 : 3;

  return (
    <div className="space-y-12">
      {/* Elite Tier: Positions 4-10 (or 5-10 for rushmore) */}
      {gridItems.length > startOffset && (
        <GridSection
          title="Elite Tier"
          gridItems={gridItems}
          startPosition={startOffset}
          endPosition={Math.min(10, gridItems.length)}
          columns={7}
          onRemove={onRemove}
          getItemTitle={getItemTitle}
        />
      )}

      {/* Core Roster: Positions 11-20 */}
      {gridItems.length > 10 && (
        <GridSection
          title="Core Roster"
          gridItems={gridItems}
          startPosition={10}
          endPosition={Math.min(20, gridItems.length)}
          columns={10}
          gap={3}
          onRemove={onRemove}
          getItemTitle={getItemTitle}
        />
      )}

      {/* Rising Stars: Positions 21-35 */}
      {gridItems.length > 20 && (
        <GridSection
          title="Rising Stars"
          gridItems={gridItems}
          startPosition={20}
          endPosition={Math.min(35, gridItems.length)}
          columns={10}
          gap={3}
          onRemove={onRemove}
          getItemTitle={getItemTitle}
        />
      )}

      {/* Reserves: Positions 36-50 */}
      {gridItems.length > 35 && (
        <GridSection
          title="Reserves"
          gridItems={gridItems}
          startPosition={35}
          endPosition={Math.min(50, gridItems.length)}
          columns={10}
          gap={3}
          onRemove={onRemove}
          getItemTitle={getItemTitle}
        />
      )}
    </div>
  );
});

/**
 * Tier-based grid sections renderer
 */
const TierGridSections = memo(function TierGridSections({
  gridItems,
  listSize,
  onRemove,
  showHeaders,
}: {
  gridItems: GridItemType[];
  listSize: number;
  onRemove: (position: number) => void;
  showHeaders: boolean;
}) {
  const {
    tiers,
    tierStats,
    collapsedTiers,
    toggleTierCollapsed,
    itemsByTier,
  } = useTierLayout(gridItems, listSize);

  return (
    <div className="space-y-8">
      {tiers.map((tier) => {
        const items = itemsByTier.get(tier.id) ?? [];
        const stats = tierStats.find((s) => s.tier.id === tier.id);

        // Skip empty tiers that are beyond the grid size
        if (items.length === 0) return null;

        return (
          <TierSection
            key={tier.id}
            tier={tier}
            items={items}
            isCollapsed={collapsedTiers[tier.id]}
            onToggleCollapsed={() => toggleTierCollapsed(tier.id)}
            onRemove={onRemove}
            getItemTitle={getItemTitle}
            stats={
              stats
                ? {
                    filledSlots: stats.filledSlots,
                    totalSlots: stats.totalSlots,
                    fillPercentage: stats.fillPercentage,
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
});

/**
 * GridRenderer Component
 */
export const GridRenderer = memo(function GridRenderer({
  gridItems,
  viewMode,
  onRemove,
  maxSize = 50,
  useTierLayout: useTiers = false,
  showTierHeaders = true,
}: GridRendererProps) {
  // Memoized remove handler to prevent unnecessary re-renders
  const handleRemove = useCallback(
    (position: number) => {
      onRemove(position);
    },
    [onRemove]
  );

  return (
    <div className="max-w-7xl mx-auto px-8 relative z-10">
      {/* View-specific top section (Podium, GOAT, Rushmore) */}
      <ViewSelector
        viewMode={viewMode}
        gridItems={gridItems}
        onRemove={handleRemove}
      />

      {/* Main grid sections */}
      {useTiers ? (
        <TierGridSections
          gridItems={gridItems}
          listSize={maxSize}
          onRemove={handleRemove}
          showHeaders={showTierHeaders}
        />
      ) : (
        <StandardGridSections
          gridItems={gridItems}
          viewMode={viewMode}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
});

/**
 * Memoized position slot for individual slot optimization
 */
export const MemoizedPositionSlot = memo(
  function MemoizedPositionSlot({
    position,
    item,
    onRemove,
    tierAccent,
    tierGlow,
    showBadge,
  }: {
    position: number;
    item: GridItemType | null;
    onRemove: () => void;
    tierAccent?: string;
    tierGlow?: string;
    showBadge?: boolean;
  }) {
    const isOccupied = item?.matched ?? false;

    // Import SimpleDropZone dynamically to avoid circular dependency
    const { SimpleDropZone } = require("../../sub_MatchCollections/SimpleDropZone");

    return (
      <SimpleDropZone
        position={position}
        isOccupied={isOccupied}
        occupiedBy={isOccupied ? getItemTitle(item) : undefined}
        imageUrl={isOccupied ? item?.image_url : undefined}
        gridItem={isOccupied ? item : undefined}
        onRemove={onRemove}
        tierAccent={tierAccent}
        tierGlow={tierGlow}
        showBadge={showBadge}
      />
    );
  },
  // Custom comparison function for fine-grained memo
  (prevProps, nextProps) => {
    // Re-render only if these specific props change
    if (prevProps.position !== nextProps.position) return false;
    if (prevProps.tierAccent !== nextProps.tierAccent) return false;
    if (prevProps.tierGlow !== nextProps.tierGlow) return false;
    if (prevProps.showBadge !== nextProps.showBadge) return false;

    // Deep compare item
    const prevItem = prevProps.item;
    const nextItem = nextProps.item;

    if (prevItem === nextItem) return true;
    if (!prevItem || !nextItem) return prevItem === nextItem;

    return (
      prevItem.id === nextItem.id &&
      prevItem.matched === nextItem.matched &&
      prevItem.image_url === nextItem.image_url &&
      prevItem.title === nextItem.title
    );
  }
);

export default GridRenderer;
