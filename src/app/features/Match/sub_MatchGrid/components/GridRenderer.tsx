"use client";

/**
 * GridRenderer
 * Pure render component for grid layout and slots
 * Uses React.memo for fine-grained render optimization
 */

import React, { memo, lazy, Suspense } from "react";

import { GridItemType } from "@/types/match";

import { GridSection } from "./GridSection";
import { TierSection } from "./TierSection";
import { PodiumViewSkeleton, GoatViewSkeleton, MountRushmoreViewSkeleton } from "./ViewSkeletons";
import { ViewMode } from "./ViewSwitcher";
import { SimpleDropZone } from "../../sub_DropZone/SimpleDropZone";

// Lazy-load view components to keep them code-split
const PodiumView = lazy(() => import("./PodiumView").then(m => ({ default: m.PodiumView })));
const GoatView = lazy(() => import("./GoatView").then(m => ({ default: m.GoatView })));
const MountRushmoreView = lazy(() => import("./MountRushmoreView").then(m => ({ default: m.MountRushmoreView })));
import { useTierLayout } from "../hooks/useTierLayout";
import { getItemTitle } from "../lib/helpers";

/**
 * Shallow-compare two GridItemType arrays by value fields.
 * Avoids re-renders when the array reference changes but data is identical.
 */
function areGridItemsEqual(prev: GridItemType[], next: GridItemType[]): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (p === n) continue;
    if (!p || !n) return false;
    if (
      p.id !== n.id ||
      p.context.matched !== n.context.matched ||
      p.item?.image_url !== n.item?.image_url ||
      p.item?.title !== n.item?.title
    ) {
      return false;
    }
  }
  return true;
}

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
const viewSkeletons: Record<string, React.ReactNode> = {
  podium: <PodiumViewSkeleton />,
  goat: <GoatViewSkeleton />,
  rushmore: <MountRushmoreViewSkeleton />,
};

export const ViewSelector = memo(
  function ViewSelector({
    viewMode,
    gridItems,
    onRemove,
    onFillViaBracket,
  }: {
    viewMode: ViewMode;
    gridItems: GridItemType[];
    onRemove: (position: number) => void;
    onFillViaBracket?: (position: number) => void;
  }) {
    let content: React.ReactNode = null;
    switch (viewMode) {
      case "podium":
        content = (
          <PodiumView
            gridItems={gridItems}
            onRemove={onRemove}
            getItemTitle={getItemTitle}
            onFillViaBracket={onFillViaBracket}
          />
        );
        break;
      case "goat":
        content = (
          <GoatView
            gridItems={gridItems}
            onRemove={onRemove}
            getItemTitle={getItemTitle}
            onFillViaBracket={onFillViaBracket}
          />
        );
        break;
      case "rushmore":
        content = (
          <MountRushmoreView
            gridItems={gridItems}
            onRemove={onRemove}
            getItemTitle={getItemTitle}
            onFillViaBracket={onFillViaBracket}
          />
        );
        break;
      default:
        return null;
    }

    return (
      <Suspense fallback={viewSkeletons[viewMode] ?? null}>
        {content}
      </Suspense>
    );
  },
  (prev, next) =>
    prev.viewMode === next.viewMode &&
    prev.onRemove === next.onRemove &&
    prev.onFillViaBracket === next.onFillViaBracket &&
    areGridItemsEqual(prev.gridItems, next.gridItems),
);

/**
 * Standard grid sections renderer
 */
const StandardGridSections = memo(function StandardGridSections({
  gridItemsLength,
  viewMode,
  onRemove,
}: {
  gridItemsLength: number;
  viewMode: ViewMode;
  onRemove: (position: number) => void;
}) {
  const startOffset = viewMode === "rushmore" ? 4 : 3;

  return (
    <div className="space-y-4 sm:space-y-8 lg:space-y-12">
      {/* Elite Tier: Positions 4-10 (or 5-10 for rushmore) */}
      {gridItemsLength > startOffset && (
        <GridSection
          title="Elite Tier"
          startPosition={startOffset}
          endPosition={Math.min(10, gridItemsLength)}
          columns={7}
          onRemove={onRemove}
        />
      )}

      {/* Core Roster: Positions 11-20 */}
      {gridItemsLength > 10 && (
        <GridSection
          title="Core Roster"
          startPosition={10}
          endPosition={Math.min(20, gridItemsLength)}
          columns={10}
          gap={3}
          onRemove={onRemove}
        />
      )}

      {/* Rising Stars: Positions 21-35 */}
      {gridItemsLength > 20 && (
        <GridSection
          title="Rising Stars"
          startPosition={20}
          endPosition={Math.min(35, gridItemsLength)}
          columns={10}
          gap={3}
          onRemove={onRemove}
        />
      )}

      {/* Reserves: Positions 36-50 */}
      {gridItemsLength > 35 && (
        <GridSection
          title="Reserves"
          startPosition={35}
          endPosition={Math.min(50, gridItemsLength)}
          columns={10}
          gap={3}
          onRemove={onRemove}
        />
      )}
    </div>
  );
});

/**
 * Tier-based grid sections renderer
 */
const TierGridSections = memo(
  function TierGridSections({
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
  },
  (prev, next) =>
    prev.listSize === next.listSize &&
    prev.onRemove === next.onRemove &&
    prev.showHeaders === next.showHeaders &&
    areGridItemsEqual(prev.gridItems, next.gridItems),
);

/**
 * GridRenderer Component
 */
export const GridRenderer = memo(
  function GridRenderer({
    gridItems,
    viewMode,
    onRemove,
    maxSize = 50,
    useTierLayout: useTiers = false,
    showTierHeaders = true,
  }: GridRendererProps) {
    return (
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 relative z-10">
        {/* View-specific top section (Podium, GOAT, Rushmore) */}
        <ViewSelector
          viewMode={viewMode}
          gridItems={gridItems}
          onRemove={onRemove}
        />

        {/* Main grid sections */}
        {useTiers ? (
          <TierGridSections
            gridItems={gridItems}
            listSize={maxSize}
            onRemove={onRemove}
            showHeaders={showTierHeaders}
          />
        ) : (
          <StandardGridSections
            gridItemsLength={gridItems.length}
            viewMode={viewMode}
            onRemove={onRemove}
          />
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.viewMode === next.viewMode &&
    prev.onRemove === next.onRemove &&
    prev.maxSize === next.maxSize &&
    prev.useTierLayout === next.useTierLayout &&
    prev.showTierHeaders === next.showTierHeaders &&
    areGridItemsEqual(prev.gridItems, next.gridItems),
);

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
    const isOccupied = item?.context.matched ?? false;

    return (
      <SimpleDropZone
        position={position}
        isOccupied={isOccupied}
        occupiedBy={isOccupied ? getItemTitle(item) : undefined}
        imageUrl={isOccupied ? item?.item?.image_url : undefined}
        gridItem={isOccupied && item ? item : undefined}
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
      prevItem.context.matched === nextItem.context.matched &&
      prevItem.item?.image_url === nextItem.item?.image_url &&
      prevItem.item?.title === nextItem.item?.title
    );
  }
);

export default GridRenderer;
