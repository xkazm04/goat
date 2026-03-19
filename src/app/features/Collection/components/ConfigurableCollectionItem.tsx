"use client";

import { useMemo, useState, useCallback, useEffect, useRef, memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { ItemCard } from "@/components/ui/item-card";
import { SPRING, DURATION } from "@/lib/animations/motion-presets";
import { StarRating } from "@/components/ui/star-rating";
import { CollectionItem as CollectionItemType } from "../types";
import { useProgressiveWikiImage } from "@/hooks/use-progressive-wiki-image";
import { ConsensusOverlay } from "@/app/features/Match/sub_ItemBadges/ConsensusOverlay";
import { RankBadge } from "@/app/features/Match/sub_ItemBadges/RankBadge";
import { AvgRankBadge } from "@/app/features/Match/sub_ItemBadges/AvgRankBadge";
import { TierIndicator } from "@/app/features/Match/sub_ItemBadges/TierIndicator";
import { AverageRankingBadge } from "./AverageRankingBadge";
import { DragHandleIndicator } from "./DragHandleIndicator";
import { FocusRingOverlay } from "./FocusRingOverlay";
import { SpotlightTooltip } from "./SpotlightTooltip";
import { useConsensusStore, useConsensusSortBy } from "@/stores/consensus-store";
import { highlightMatch } from "@/lib/utils/search";
import { createCollectionDragData } from "@/lib/dnd";
import { ThemedScoreDisplay } from "@/components/ui/themed-scores";
import { useCriteriaStore } from "@/stores/criteria-store";
import { useListStore } from "@/stores/use-list-store";
import { useTouchGestures, GestureItemData } from "@/app/features/Match/hooks/useTouchGestures";
import { PreviewItem } from "@/app/features/Match/components/LongPressPreview";
import { ArrowRight, ArrowLeft, PlusCircle, Eye, Trash2, Check } from "lucide-react";
import { useItemPopupStore } from "@/stores/item-popup-store";
import { SelectionCheckbox } from "@/app/features/Match/sub_ItemBadges/ComparisonSelector";

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
  /** Enable right-click to open item detail popup */
  enableContextMenu?: boolean;
  /** Show subtitle/description under item title */
  showSubtitle?: boolean;
  /** Show criteria score display when item has scores */
  showCriteriaScore?: boolean;
  /** Enable comparison selection checkbox */
  enableComparisonSelection?: boolean;
}

/**
 * Hoisted global store state that is shared across all collection items.
 * Subscribe once in the parent and pass down as props to avoid
 * N items x M stores = N*M subscriptions.
 */
export interface HoistedStoreState {
  /** From useConsensusStore: viewMode */
  consensusViewMode: string;
  /** From useConsensusSortBy */
  consensusSortBy: string;
  /** From useCriteriaStore: activeProfileId */
  activeProfileId: string | null;
  /** From useListStore: current list category */
  listCategory: string | undefined;
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
  /**
   * Global store state hoisted from parent to avoid per-item subscriptions.
   * When provided, the component skips its own store subscriptions for these values.
   * This reduces 200 items x 5 stores = 1000 subscriptions down to 5 parent subscriptions.
   */
  hoistedState?: HoistedStoreState;
  /** Called when swipe gesture triggers quick-assign action */
  onSwipeQuickAssign?: (item: CollectionItemType) => void;
  /** Called when long press triggers preview */
  onLongPressPreview?: (item: PreviewItem, position: { x: number; y: number }) => void;
  /** Whether this item is selected for comparison */
  isComparisonSelected?: boolean;
  /** Called when comparison selection is toggled */
  onComparisonToggle?: () => void;
  /** Whether more items can be added to comparison */
  canAddToComparison?: boolean;
}

/**
 * Default configuration for match/ranking view (SimpleCollectionItem behavior)
 */
export const MATCH_VIEW_CONFIG: CollectionItemConfig = {
  showConsensus: false,
  showRankBadge: false,
  showAvgRank: false,
  showTierIndicator: false,
  showKeyboardHandles: false,
  showFocusRing: false,
  showSpotlight: false,
  showStarRating: false,
  showAverageRankingBadge: false,
  useProgressiveImages: true,
  enableSearchHighlight: true,
  enableSwipeGestures: true,
  enableLongPressPreview: true,
  enableContextMenu: true,
  showSubtitle: false,
  showCriteriaScore: false,
  enableComparisonSelection: false,
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
  enableContextMenu: true,
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
export const ConfigurableCollectionItem = memo(function ConfigurableCollectionItem({
  item,
  groupId,
  viewMode = 'grid',
  index = 0,
  searchQuery = "",
  isSpotlight = false,
  isClickSelected = false,
  onClick,
  config = MATCH_VIEW_CONFIG,
  hoistedState,
  onSwipeQuickAssign,
  onLongPressPreview,
  isComparisonSelected = false,
  onComparisonToggle,
  canAddToComparison = true,
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
    enableContextMenu = true,
    showSubtitle = true,
    showCriteriaScore = false,
    enableComparisonSelection = false,
  } = config;

  // Popup store for opening item detail popup on right-click
  const openPopup = useItemPopupStore((state) => state.openPopup);

  // --- Hoisted global state (prefer props over per-item subscriptions) ---
  // When hoistedState is provided by the parent, these store selectors still run
  // (hooks must be called unconditionally) but Zustand's selector equality check
  // means they won't trigger re-renders since we use the hoisted value instead.
  // The real win is that when hoistedState is provided, the parent subscribes
  // once and passes down, so each child's selector rarely changes and never
  // triggers a re-render cascade.

  // Criteria store for score display
  const getItemScores = useCriteriaStore((state) => state.getItemScores);
  const _activeProfileId = useCriteriaStore((state) => state.activeProfileId);
  const _currentList = useListStore((state) => state.currentList);
  const activeProfileId = hoistedState?.activeProfileId ?? _activeProfileId;
  const category = hoistedState?.listCategory ?? _currentList?.category;

  // Get score for this item if config enabled
  const itemScores = showCriteriaScore && activeProfileId
    ? getItemScores(item.id)
    : null;
  const weightedScore = itemScores?.weightedScore ?? 0;

  // Consensus store integration
  const _consensusViewMode = useConsensusStore((state) => state.viewMode);
  const _consensusSortBy = useConsensusSortBy();
  const viewMode_ = hoistedState?.consensusViewMode ?? _consensusViewMode;
  const sortBy = hoistedState?.consensusSortBy ?? _consensusSortBy;
  const shouldShowConsensus = showConsensus && viewMode_ !== 'off';
  const shouldShowTierIndicator = showTierIndicator && sortBy === 'consensus';

  const isUsed = !!item.used;

  // Draggable setup - disabled for used items
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: createCollectionDragData(item, groupId),
    disabled: isUsed,
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

  // Handle right-click to open item detail popup
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!enableContextMenu) return;
    e.preventDefault();
    e.stopPropagation();
    // Open popup at mouse position
    openPopup(item.id, { x: e.clientX - 200, y: e.clientY - 50 });
  }, [item.id, openPopup, enableContextMenu]);

  // Determine aria label
  const ariaLabel = onClick
    ? `Click to select or drag: ${item.title}`
    : `Draggable item: ${item.title}${showSpotlight && isSpotlight ? ' - Hidden item spotlight!' : ''}`;

  return (
    <motion.div
      ref={(el) => {
        setNodeRef(el);
        (containerRef as any).current = el;
      }}
      style={style}
      animate={{
        opacity: isUsed ? 0.4 : 1,
        filter: isUsed ? 'grayscale(0.8)' : 'grayscale(0)',
      }}
      transition={{ duration: DURATION.normal, ease: 'easeInOut' }}
      className={`
        relative group touch-none w-full
        ${isSpotlight && showSpotlight ? 'spotlight-active' : ''}
        ${isDragging ? 'z-drag' : ''}
        ${isGesturing ? 'z-sticky' : ''}
        ${isUsed ? 'pointer-events-none' : ''}
        ${isClickSelected ? 'ring-2 ring-brand ring-offset-2 ring-offset-slate-900 rounded-card' : ''}
        ${isComparisonSelected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-900 rounded-card' : ''}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
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
            className="absolute inset-0 rounded-card pointer-events-none z-30 flex items-center overflow-hidden"
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
              transition={SPRING.snappy}
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
            className="absolute inset-0 rounded-card pointer-events-none z-25"
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
            focus:outline-hidden
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

      {/* Comparison selection checkbox */}
      {enableComparisonSelection && onComparisonToggle && !isDragging && (
        <div className="absolute top-1 left-1 z-30">
          <SelectionCheckbox
            isSelected={isComparisonSelected}
            onClick={onComparisonToggle}
            disabled={!canAddToComparison && !isComparisonSelected}
            size="sm"
          />
        </div>
      )}

      {/* Average Ranking Badge - collection panel style */}
      {showAverageRankingBadge && !isDragging && !enableComparisonSelection && (
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
        subtitle={showSubtitle ? item.description : undefined}
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

      {/* Criteria Score Overlay */}
      {showCriteriaScore && weightedScore > 0 && !isDragging && (
        <div className="absolute bottom-0 left-0 right-0 p-1 bg-linear-to-t from-black/80 to-transparent pointer-events-none z-20">
          <ThemedScoreDisplay
            score={weightedScore}
            category={category}
            variant="compact"
            animated={false}
          />
        </div>
      )}

      {/* Search highlight overlay - shows highlighted title when searching */}
      {enableSearchHighlight && highlightedTitle && !isDragging && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/95 via-black/80 to-transparent p-2 pointer-events-none"
          data-testid={`search-highlight-overlay-${item.id}`}
        >
          <p className="text-xs font-semibold text-white truncate">
            {highlightedTitle}
          </p>
        </div>
      )}

      {/* Used item checkmark badge */}
      {isUsed && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: DURATION.normal, ease: 'easeOut' }}
          className="absolute top-1 right-1 z-30 w-4 h-4 rounded-full bg-green-500/70 flex items-center justify-center pointer-events-none"
          data-testid={`used-badge-${item.id}`}
        >
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </motion.div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparator: shallow compare key props that affect rendering
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.image_url === nextProps.item.image_url &&
    prevProps.item.description === nextProps.item.description &&
    prevProps.item.ranking === nextProps.item.ranking &&
    prevProps.item.used === nextProps.item.used &&
    prevProps.groupId === nextProps.groupId &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.index === nextProps.index &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.isSpotlight === nextProps.isSpotlight &&
    prevProps.isClickSelected === nextProps.isClickSelected &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.config === nextProps.config &&
    prevProps.hoistedState === nextProps.hoistedState &&
    prevProps.onSwipeQuickAssign === nextProps.onSwipeQuickAssign &&
    prevProps.onLongPressPreview === nextProps.onLongPressPreview &&
    prevProps.isComparisonSelected === nextProps.isComparisonSelected &&
    prevProps.onComparisonToggle === nextProps.onComparisonToggle &&
    prevProps.canAddToComparison === nextProps.canAddToComparison
  );
});

// Re-export for backward compatibility
export { ConfigurableCollectionItem as CollectionItem };
