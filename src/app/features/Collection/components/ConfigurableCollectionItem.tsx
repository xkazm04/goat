"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
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
import { useTouchGestures, GestureItemData } from "@/app/features/Match/hooks/useTouchGestures";
import { PreviewItem } from "@/app/features/Match/components/LongPressPreview";
import { ArrowRight, ArrowLeft, PlusCircle, Eye, Trash2, Info } from "lucide-react";
import { useInspectorStore } from "@/stores/inspector-store";

/**
 * Swipe action icon mapping
 */
const SWIPE_ACTION_ICONS: Record<string, React.ReactNode> = {
  "quick-assign": <PlusCircle className="w-5 h-5" />,
  remove: <Trash2 className="w-5 h-5" />,
  preview: <Eye className="w-5 h-5" />,
};

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
  /** Enable swipe gesture shortcuts (mobile) */
  enableSwipeGestures?: boolean;
  /** Enable long press preview (mobile) */
  enableLongPressPreview?: boolean;
  /** Show info button to open item inspector */
  showInspectorButton?: boolean;
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
  /** Called when swipe gesture triggers quick-assign action */
  onSwipeQuickAssign?: (item: CollectionItemType) => void;
  /** Called when long press triggers preview */
  onLongPressPreview?: (item: PreviewItem, position: { x: number; y: number }) => void;
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
  enableSwipeGestures: true,
  enableLongPressPreview: true,
  showInspectorButton: true,
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
  enableSwipeGestures: true,
  enableLongPressPreview: true,
  showInspectorButton: true,
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
  onSwipeQuickAssign,
  onLongPressPreview,
}: ConfigurableCollectionItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    enableSwipeGestures = true,
    enableLongPressPreview = true,
    showInspectorButton = true,
  } = config;

  // Inspector store for opening item details
  const openInspector = useInspectorStore((state) => state.openInspector);

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

  // Gesture action handlers
  const handleSwipeAction = useCallback(
    (result: { action: string; success: boolean }) => {
      if (result.success && result.action === "quick-assign" && onSwipeQuickAssign) {
        onSwipeQuickAssign(item);
      }
    },
    [item, onSwipeQuickAssign]
  );

  const handleShowPreview = useCallback(
    (previewItem: PreviewItem, position: { x: number; y: number }) => {
      if (onLongPressPreview) {
        onLongPressPreview(previewItem, position);
      }
    },
    [onLongPressPreview]
  );

  // Touch gesture integration
  const {
    handlers: gestureHandlers,
    isGesturing,
    swipeIndicator,
    setItemData: setGestureItemData,
  } = useTouchGestures(
    {
      enabled: enableSwipeGestures && !isDragging,
      contextType: "backlog",
      swipeShortcutsEnabled: true,
      longPressPreviewEnabled: enableLongPressPreview && !!onLongPressPreview,
    },
    {
      onAction: handleSwipeAction,
      onShowPreview: handleShowPreview,
    }
  );

  // Sync item data with gesture system
  useEffect(() => {
    const gestureItemData: GestureItemData = {
      id: item.id,
      title: item.title,
      imageUrl: item.image_url,
      description: item.description,
    };
    setGestureItemData(gestureItemData);
  }, [item, setGestureItemData]);

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

  // Handle opening item inspector
  const handleOpenInspector = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    openInspector(item.id);
  }, [item.id, openInspector]);

  // Determine aria label
  const ariaLabel = onClick
    ? `Click to select or drag: ${item.title}`
    : `Draggable item: ${item.title}${showSpotlight && isSpotlight ? ' - Hidden item spotlight!' : ''}`;

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        (containerRef as any).current = el;
      }}
      style={style}
      className={`
        relative group touch-none
        ${isSpotlight && showSpotlight ? 'spotlight-active' : ''}
        ${isDragging ? 'z-50' : ''}
        ${isGesturing ? 'z-40' : ''}
        ${isClickSelected ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 rounded-lg' : ''}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...gestureHandlers}
      data-testid={
        isSpotlight && showSpotlight
          ? "collection-item-spotlight"
          : `collection-item-wrapper-${item.id}`
      }
      data-gesturing={isGesturing}
    >
      {/* Swipe action indicator */}
      <AnimatePresence>
        {enableSwipeGestures && swipeIndicator.direction && swipeIndicator.progress > 0.2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: swipeIndicator.progress }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-lg pointer-events-none z-30 flex items-center overflow-hidden"
            style={{
              justifyContent: swipeIndicator.direction === "right" ? "flex-start" : "flex-end",
            }}
          >
            {/* Action indicator bar */}
            <motion.div
              className="h-full flex items-center justify-center px-3"
              style={{
                backgroundColor: swipeIndicator.color ? `${swipeIndicator.color}30` : "rgba(34, 211, 238, 0.3)",
                width: `${swipeIndicator.progress * 100}%`,
                maxWidth: "40%",
              }}
              animate={{ width: `${swipeIndicator.progress * 100}%` }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <motion.div
                className="text-white"
                style={{ color: swipeIndicator.color || "#22d3ee" }}
                initial={{ opacity: 0, x: swipeIndicator.direction === "right" ? -8 : 8 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {swipeIndicator.action && SWIPE_ACTION_ICONS[swipeIndicator.action] || (
                  swipeIndicator.direction === "right" ? (
                    <ArrowRight className="w-4 h-4" />
                  ) : (
                    <ArrowLeft className="w-4 h-4" />
                  )
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe direction border glow */}
      <AnimatePresence>
        {enableSwipeGestures && swipeIndicator.direction && swipeIndicator.progress > 0.3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: swipeIndicator.progress }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-lg pointer-events-none z-25"
            style={{
              border: `2px solid ${swipeIndicator.color || "#22d3ee"}`,
              boxShadow: `0 0 12px ${swipeIndicator.color || "#22d3ee"}40`,
            }}
          />
        )}
      </AnimatePresence>

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
        // Simple drag overlay - covers entire item for drag interaction
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
          data-testid={`draggable-overlay-${item.id}`}
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

      {/* Inspector button - shows on hover */}
      {showInspectorButton && !isDragging && (
        <AnimatePresence>
          {isHovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleOpenInspector}
              className="absolute bottom-1.5 left-1.5 z-20 p-1.5 rounded-lg bg-gray-900/80 backdrop-blur-sm border border-gray-600/50 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-gray-800/90 transition-colors"
              aria-label={`View details for ${item.title}`}
              data-testid={`inspector-button-${item.id}`}
            >
              <Info className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
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
