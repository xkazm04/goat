"use client";

import { useMemo, useState, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ItemCard } from "@/components/ui/item-card";
import { StarRating } from "@/components/ui/star-rating";
import { CollectionItem as CollectionItemType } from "../types";
import { useProgressiveWikiImage } from "@/hooks/use-progressive-wiki-image";
import { ConsensusOverlay } from "@/app/features/Match/sub_MatchCollections/components/ConsensusOverlay";
import { RankBadge } from "@/app/features/Match/sub_MatchCollections/components/RankBadge";
import { AvgRankBadge } from "@/app/features/Match/sub_MatchCollections/components/AvgRankBadge";
import { TierIndicator } from "@/app/features/Match/sub_MatchCollections/components/TierIndicator";
import { AverageRankingBadge } from "./AverageRankingBadge";
import { DragHandleIndicator } from "./DragHandleIndicator";
import { FocusRingOverlay } from "./FocusRingOverlay";
import { SpotlightTooltip } from "./SpotlightTooltip";
import { useConsensusStore, useConsensusSortBy } from "@/stores/consensus-store";
import { highlightMatch } from "@/app/features/Match/sub_MatchCollections/components/CollectionSearch";
import { createCollectionDragData } from "@/lib/dnd";

/**
 * Configuration options for the collection item features
 */
export interface CollectionItemConfig {
  /** Show consensus ranking overlay (median rank, volatility) */
  showConsensus?: boolean;
  /** Show rank badge with stars */
  showRankBadge?: boolean;
  /** Show average ranking badge on hover */
  showAvgRank?: boolean;
  /** Show tier indicator when sorting by consensus */
  showTierIndicator?: boolean;
  /** Show keyboard drag handles */
  showKeyboardHandles?: boolean;
  /** Show focus ring overlay for accessibility */
  showFocusRing?: boolean;
  /** Show spotlight tooltip for easter eggs */
  showSpotlight?: boolean;
  /** Show star rating in actions */
  showStarRating?: boolean;
  /** Show average ranking badge (alternative style) */
  showAverageRankingBadge?: boolean;
  /** Use progressive wiki image loading */
  useProgressiveImages?: boolean;
  /** Enable search query highlighting */
  enableSearchHighlight?: boolean;
}

export interface ConfigurableCollectionItemProps {
  item: CollectionItemType;
  groupId: string;
  /** View mode for layout */
  viewMode?: 'grid' | 'list';
  /** Index of the item for staggered animations */
  index?: number;
  /** Search query for highlighting matches */
  searchQuery?: string;
  /** Whether this item is the spotlighted easter egg item */
  isSpotlight?: boolean;
  /** Whether this item is selected via click-to-assign */
  isClickSelected?: boolean;
  /** Click handler for click-to-assign */
  onClick?: () => void;
  /** Feature configuration */
  config?: CollectionItemConfig;
}

/**
 * Default configuration for match/ranking view (SimpleCollectionItem behavior)
 */
export const MATCH_VIEW_CONFIG: CollectionItemConfig = {
  showConsensus: true,
  showRankBadge: true,
  showAvgRank: true,
  showTierIndicator: true,
  showKeyboardHandles: false,
  showFocusRing: false,
  showSpotlight: false,
  showStarRating: false,
  showAverageRankingBadge: false,
  useProgressiveImages: true,
  enableSearchHighlight: true,
};

/**
 * Default configuration for collection panel view (CollectionItem behavior)
 */
export const COLLECTION_VIEW_CONFIG: CollectionItemConfig = {
  showConsensus: false,
  showRankBadge: false,
  showAvgRank: false,
  showTierIndicator: false,
  showKeyboardHandles: true,
  showFocusRing: true,
  showSpotlight: true,
  showStarRating: true,
  showAverageRankingBadge: true,
  useProgressiveImages: false,
  enableSearchHighlight: false,
};

/**
 * Unified draggable collection item component
 *
 * Consolidates SimpleCollectionItem and CollectionItem functionality into a single
 * configurable component. Use the `config` prop to enable/disable features:
 *
 * Features:
 * - Supports both grid and list view modes
 * - Uses @dnd-kit useDraggable for drag-and-drop
 * - Consensus ranking overlay (median rank, volatility, peer clusters)
 * - Rank badge with micro-animations
 * - Average ranking badges (both styles)
 * - Tier indicator for consensus sorting
 * - Keyboard accessible with focus rings
 * - Screen reader support with aria labels
 * - Easter egg spotlight effect with tooltip
 * - Progressive wiki image loading
 * - Search query highlighting
 */
export function ConfigurableCollectionItem({
  item,
  groupId,
  viewMode = 'grid',
  index = 0,
  searchQuery = "",
  isSpotlight = false,
  isClickSelected = false,
  onClick,
  config = MATCH_VIEW_CONFIG,
}: ConfigurableCollectionItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Merge config with defaults
  const {
    showConsensus = false,
    showRankBadge = false,
    showAvgRank = false,
    showTierIndicator = false,
    showKeyboardHandles = false,
    showFocusRing = false,
    showSpotlight = false,
    showStarRating = false,
    showAverageRankingBadge = false,
    useProgressiveImages = false,
    enableSearchHighlight = false,
  } = config;

  // Consensus store integration
  const viewMode_ = useConsensusStore((state) => state.viewMode);
  const sortBy = useConsensusSortBy();
  const shouldShowConsensus = showConsensus && viewMode_ !== 'off';
  const shouldShowTierIndicator = showTierIndicator && sortBy === 'consensus';

  // Draggable setup
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: createCollectionDragData(item, groupId),
  });

  // Style with optional transform
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : isFocused ? 10 : 'auto',
  } : {
    zIndex: isFocused ? 10 : 'auto',
  };

  // Progressive image loading (only if enabled)
  const {
    imageUrl: progressiveImageUrl,
    isFetching: isLoadingWiki,
  } = useProgressiveWikiImage({
    itemTitle: item.title,
    existingImage: item.image_url,
    autoFetch: useProgressiveImages,
  });

  const currentImageUrl = useProgressiveImages ? progressiveImageUrl : item.image_url;

  // Memoize highlighted title when search is active
  const highlightedTitle = useMemo(() => {
    if (!enableSearchHighlight || !searchQuery.trim()) return null;
    return highlightMatch(item.title, searchQuery);
  }, [item.title, searchQuery, enableSearchHighlight]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (showSpotlight && isSpotlight) {
      setShowTooltip(true);
    }
  }, [showSpotlight, isSpotlight]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowTooltip(false);
  }, []);

  const showDragHandle = showKeyboardHandles && (isFocused || isDragging);

  // Determine aria label
  const ariaLabel = onClick
    ? `Click to select or drag: ${item.title}`
    : `Draggable item: ${item.title}${showSpotlight && isSpotlight ? ' - Hidden item spotlight!' : ''}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group touch-none
        ${isSpotlight && showSpotlight ? 'spotlight-active' : ''}
        ${isDragging ? 'z-50' : ''}
        ${isClickSelected ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 rounded-lg' : ''}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid={
        isSpotlight && showSpotlight
          ? "collection-item-spotlight"
          : `collection-item-wrapper-${item.id}`
      }
    >
      {/* Easter egg tooltip */}
      {showSpotlight && (
        <SpotlightTooltip visible={isSpotlight && showTooltip} />
      )}

      {/* Keyboard drag handle indicator - shows on focus */}
      {showKeyboardHandles && (
        <DragHandleIndicator
          itemId={item.id}
          isDragging={isDragging}
          visible={showDragHandle}
        />
      )}

      {/* Focusable drag area (keyboard handles mode) */}
      {showKeyboardHandles ? (
        <div
          {...attributes}
          {...listeners}
          tabIndex={0}
          role="button"
          aria-roledescription="draggable"
          aria-describedby={`draggable-instructions-${item.id}`}
          aria-label={`Drag ${item.title} to a grid position. Press Space or Enter to start dragging.`}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`
            absolute inset-0 z-10
            cursor-grab active:cursor-grabbing
            focus:outline-none
            ${isDragging ? 'cursor-grabbing' : ''}
          `}
          data-testid={`draggable-handle-${item.id}`}
        >
          {/* Hidden instructions for screen readers */}
          <span id={`draggable-instructions-${item.id}`} className="sr-only">
            Press Space or Enter to start dragging this item. Use arrow keys to navigate to a drop target.
            Press Space or Enter to drop, or Escape to cancel.
          </span>
        </div>
      ) : (
        // Simple drag wrapper (no separate focus area)
        <div
          {...attributes}
          {...listeners}
          className="cursor-pointer"
        />
      )}

      {/* Focus ring overlay */}
      {showFocusRing && (
        <FocusRingOverlay
          itemId={item.id}
          isFocused={isFocused}
          isDragging={isDragging}
        />
      )}

      {/* Tier indicator - shows when sorting by consensus */}
      {shouldShowTierIndicator && !isDragging && (
        <TierIndicator
          itemId={item.id}
          size="sm"
          position="top-left"
        />
      )}

      {/* Average Ranking Badge - collection panel style */}
      {showAverageRankingBadge && !isDragging && (
        <AverageRankingBadge
          itemId={item.id}
          position="top-left"
          variant="compact"
        />
      )}

      {/* Rank badge with micro-animation */}
      {showRankBadge && !isDragging && item.ranking !== undefined && (
        <RankBadge
          ranking={item.ranking}
          format="stars"
          animationIndex={index}
          itemId={item.id}
        />
      )}

      {/* Average ranking badge on hover - match view style */}
      {showAvgRank && !isDragging && (
        <AvgRankBadge
          itemId={item.id}
          isHovered={isHovered}
          position="bottom-right"
        />
      )}

      {/* Consensus ranking overlay */}
      {shouldShowConsensus && !isDragging && (
        <ConsensusOverlay itemId={item.id} />
      )}

      <ItemCard
        title={item.title}
        subtitle={item.description}
        image={currentImageUrl}
        layout={viewMode}
        interactive="draggable"
        state={isDragging ? "dragging" : isClickSelected ? "default" : "default"}
        animated={showKeyboardHandles}
        animationDelay={showKeyboardHandles ? (viewMode === 'list' ? index * 0.02 : index * 0.01) : 0}
        progressive={useProgressiveImages}
        ariaLabel={ariaLabel}
        ariaDescription={item.description || `${item.title} from ${groupId}`}
        testId={`collection-item-${item.id}`}
        hoverEffect="subtle"
        focusRing={false}
        loading={useProgressiveImages && isLoadingWiki}
        tabIndex={showKeyboardHandles ? -1 : undefined}
        actions={
          showStarRating && item.ranking !== undefined && item.ranking > 0 ? (
            <StarRating
              value={item.ranking}
              size="sm"
              testId={`item-ranking-${item.id}`}
            />
          ) : null
        }
        actionsPosition={viewMode === 'list' ? 'top-right' : 'top-right'}
      />

      {/* Search highlight overlay - shows highlighted title when searching */}
      {enableSearchHighlight && highlightedTitle && !isDragging && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 pointer-events-none"
          data-testid={`search-highlight-overlay-${item.id}`}
        >
          <p className="text-[10px] font-semibold text-white truncate">
            {highlightedTitle}
          </p>
        </div>
      )}
    </div>
  );
}

// Re-export for backward compatibility
export { ConfigurableCollectionItem as CollectionItem };
