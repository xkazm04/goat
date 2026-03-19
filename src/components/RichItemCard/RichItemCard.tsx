'use client';

/**
 * RichItemCard - Feature-rich item card with built-in interactivity and metadata display.
 *
 * USE THIS WHEN:
 * - Displaying items in browse/explore contexts where users benefit from previews
 * - You want hover-to-expand, quick action overlays, metadata badges, or mini galleries
 *   without wiring them up manually
 * - You need Letterboxd-style card flip to reveal detailed metadata
 * - You want auto-generated badges from item data (rating, year, genre)
 * - Accessibility and keyboard shortcuts are important (1-9 for quick actions,
 *   Enter/Space to expand/flip, Escape to dismiss, arrow keys for gallery)
 *
 * DO NOT USE WHEN:
 * - Rendering items inside the match grid or drag-and-drop zones -- use ItemCard
 *   (@/components/ui/item-card) for its lighter weight and drag state support
 * - You need maximum render performance in large virtualized lists (RichItemCard
 *   carries more internal state and event handlers)
 *
 * HOW IT DIFFERS FROM ItemCard:
 * - RichItemCard is a **superset** of ItemCard's visual capabilities, but uses a
 *   different data contract (RichItemData object vs individual props).
 * - RichItemCard manages its own hover/expand/flip/gallery state internally.
 * - ItemCard is a thin wrapper; RichItemCard is a self-contained interactive widget.
 *
 * REQUIRED PROPS: item (RichItemData with id and title)
 * KEY OPTIONAL PROPS: config (RichItemCardConfig), quickActions, badges, indicators,
 *   viewMode, isDragging, isSelected, onClick, onQuickAction, renderExpandedContent,
 *   renderFlipContent
 */

import React, {
  memo,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION } from '@/lib/animations/motion-presets';
import { cn } from '@/lib/utils';
import { QuickActions, QuickActionConfig } from './QuickActions';
import { MetadataBadges, MetadataBadgeData } from './MetadataBadges';
import { ExpandedPreview } from './ExpandedPreview';
import { CardFlipReveal } from './CardFlipReveal';
import { MiniGallery } from './MiniGallery';
import { ItemIndicators, ItemIndicatorState } from './ItemIndicators';

/**
 * Item data structure for RichItemCard
 */
export interface RichItemData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string | null;
  images?: string[];
  metadata?: Record<string, unknown>;
  rating?: number;
  year?: number | string;
  genre?: string;
  tags?: string[];
}

/**
 * Configuration for RichItemCard features
 */
export interface RichItemCardConfig {
  /** Enable hover expansion */
  enableExpand?: boolean;
  /** Expand trigger: hover, click, or both */
  expandTrigger?: 'hover' | 'click' | 'both';
  /** Expand delay in ms */
  expandDelay?: number;
  /** Enable quick actions */
  enableQuickActions?: boolean;
  /** Enable metadata badges */
  enableBadges?: boolean;
  /** Enable mini gallery on hover */
  enableGallery?: boolean;
  /** Enable status indicators */
  enableIndicators?: boolean;
  /** Enable keyboard shortcuts */
  enableKeyboardShortcuts?: boolean;
  /** Show tooltip on hover */
  enableTooltip?: boolean;
  /** Enable Letterboxd-style card flip to reveal metadata */
  enableFlip?: boolean;
  /** Flip trigger: tap, hover, or both */
  flipTrigger?: 'tap' | 'hover' | 'both';
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RichItemCardConfig = {
  enableExpand: true,
  expandTrigger: 'hover',
  expandDelay: 300,
  enableQuickActions: true,
  enableBadges: true,
  enableGallery: true,
  enableIndicators: true,
  enableKeyboardShortcuts: true,
  enableTooltip: true,
  enableFlip: false,
  flipTrigger: 'tap',
};

/**
 * Props for RichItemCard component
 */
export interface RichItemCardProps {
  /** Item data */
  item: RichItemData;
  /** Configuration options */
  config?: RichItemCardConfig;
  /** Quick action configurations */
  quickActions?: QuickActionConfig[];
  /** Metadata badges to display */
  badges?: MetadataBadgeData[];
  /** Item status indicators */
  indicators?: ItemIndicatorState;
  /** View mode */
  viewMode?: 'grid' | 'list';
  /** Whether item is being dragged */
  isDragging?: boolean;
  /** Whether item is selected */
  isSelected?: boolean;
  /** Index for staggered animations */
  index?: number;
  /** Callback when item is clicked */
  onClick?: (item: RichItemData) => void;
  /** Callback when quick action is triggered */
  onQuickAction?: (action: string, item: RichItemData) => void;
  /** Callback when expanded state changes */
  onExpandChange?: (expanded: boolean, item: RichItemData) => void;
  /** Custom render for expanded content */
  renderExpandedContent?: (item: RichItemData) => React.ReactNode;
  /** Custom render for card flip back face */
  renderFlipContent?: (item: RichItemData) => React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Test ID */
  testId?: string;
}

/**
 * RichItemCard Component
 *
 * An enhanced item card with rich preview capabilities including:
 * - Expandable detail view on hover/tap
 * - Quick action buttons
 * - Metadata badges (rating, year, genre)
 * - Visual status indicators
 * - Mini image gallery
 * - Keyboard shortcuts
 * - Full accessibility support
 */
export const RichItemCard = memo(function RichItemCard({
  item,
  config: userConfig,
  quickActions = [],
  badges = [],
  indicators,
  viewMode = 'grid',
  isDragging = false,
  isSelected = false,
  index = 0,
  onClick,
  onQuickAction,
  onExpandChange,
  renderExpandedContent,
  renderFlipContent,
  className,
  testId,
}: RichItemCardProps) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const containerRef = useRef<HTMLDivElement>(null);
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  // Clear expand timeout on unmount
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
    };
  }, []);

  // Notify parent of expand changes
  useEffect(() => {
    onExpandChange?.(isExpanded, item);
  }, [isExpanded, item, onExpandChange]);

  // Handle hover enter
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);

    if (config.enableFlip && (config.flipTrigger === 'hover' || config.flipTrigger === 'both')) {
      expandTimeoutRef.current = setTimeout(() => {
        setIsFlipped(true);
      }, config.expandDelay);
      return;
    }

    if (config.enableExpand && (config.expandTrigger === 'hover' || config.expandTrigger === 'both')) {
      expandTimeoutRef.current = setTimeout(() => {
        setIsExpanded(true);
      }, config.expandDelay);
    }
  }, [config]);

  // Handle hover leave
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);

    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
    }

    if (config.enableFlip && (config.flipTrigger === 'hover' || config.flipTrigger === 'both')) {
      setIsFlipped(false);
    }

    if (config.expandTrigger === 'hover') {
      setIsExpanded(false);
    }
  }, [config]);

  // Handle click
  const handleClick = useCallback(() => {
    if (config.enableFlip && (config.flipTrigger === 'tap' || config.flipTrigger === 'both')) {
      setIsFlipped((prev) => !prev);
      return;
    }
    if (config.enableExpand && (config.expandTrigger === 'click' || config.expandTrigger === 'both')) {
      setIsExpanded((prev) => !prev);
    }
    onClick?.(item);
  }, [config, item, onClick]);

  // Handle quick action
  const handleQuickAction = useCallback(
    (actionId: string) => {
      onQuickAction?.(actionId, item);
    },
    [item, onQuickAction]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!config.enableKeyboardShortcuts) return;

      // Quick action shortcuts (1-9)
      if (e.key >= '1' && e.key <= '9') {
        const actionIndex = parseInt(e.key) - 1;
        if (quickActions[actionIndex]) {
          e.preventDefault();
          handleQuickAction(quickActions[actionIndex].id);
        }
      }

      // Enter/Space to expand or flip
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (config.enableFlip) {
          setIsFlipped((prev) => !prev);
        } else if (config.enableExpand) {
          setIsExpanded((prev) => !prev);
        }
      }

      // Escape to collapse or unflip
      if (e.key === 'Escape') {
        if (isFlipped) {
          e.preventDefault();
          setIsFlipped(false);
        } else if (isExpanded) {
          e.preventDefault();
          setIsExpanded(false);
        }
      }

      // Arrow keys for gallery navigation
      if (config.enableGallery && item.images && item.images.length > 1) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setActiveGalleryIndex((prev) =>
            prev > 0 ? prev - 1 : item.images!.length - 1
          );
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setActiveGalleryIndex((prev) =>
            prev < item.images!.length - 1 ? prev + 1 : 0
          );
        }
      }
    },
    [config, quickActions, handleQuickAction, isExpanded, isFlipped, item.images]
  );

  // Generate auto badges from metadata if not provided
  const effectiveBadges = useMemo(() => {
    if (badges.length > 0) return badges;

    const autoBadges: MetadataBadgeData[] = [];

    if (item.rating !== undefined) {
      autoBadges.push({
        type: 'rating',
        value: item.rating,
        label: 'Rating',
      });
    }

    if (item.year) {
      autoBadges.push({
        type: 'year',
        value: item.year,
        label: 'Year',
      });
    }

    if (item.genre) {
      autoBadges.push({
        type: 'genre',
        value: item.genre,
        label: 'Genre',
      });
    }

    return autoBadges;
  }, [badges, item]);

  // Determine if should show flip or expanded view
  const showFlip = config.enableFlip && !isDragging;
  const showExpanded = isExpanded && !isDragging && !config.enableFlip;
  const showQuickActions = config.enableQuickActions && (isHovered || isFocused) && !isDragging && quickActions.length > 0;
  const showBadges = config.enableBadges && effectiveBadges.length > 0 && !isDragging;
  const showGallery = config.enableGallery && item.images && item.images.length > 1 && isHovered && !isDragging;
  const showIndicators = config.enableIndicators && indicators && !isDragging;

  // Current display image
  const displayImage = showGallery && item.images
    ? item.images[activeGalleryIndex]
    : item.image;

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'relative group rounded-card overflow-hidden',
        'bg-[var(--surface-card)] border border-[var(--border-card)]',
        'transition-colors duration-200',
        isHovered && 'border-brand/50',
        isSelected && 'ring-2 ring-brand',
        isDragging && 'opacity-50 scale-95',
        'focus-ring',
        viewMode === 'grid' ? 'aspect-4/5' : 'flex items-center gap-3 p-2',
        className
      )}
      style={{ contain: 'layout style paint' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: DURATION.quick }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
      role="button"
      aria-label={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
      aria-expanded={isExpanded}
      data-testid={testId || `rich-item-card-${item.id}`}
    >
      {/* Status Indicators */}
      <AnimatePresence>
        {showIndicators && (
          <ItemIndicators
            state={indicators}
            position="top-left"
            size="sm"
          />
        )}
      </AnimatePresence>

      {/* Metadata Badges */}
      <AnimatePresence>
        {showBadges && (
          <MetadataBadges
            badges={effectiveBadges}
            position="top-right"
            size="sm"
            maxVisible={3}
          />
        )}
      </AnimatePresence>

      {/* Image Area */}
      <div className={cn(
        'relative overflow-hidden bg-[var(--surface-deep)]',
        viewMode === 'grid' ? 'aspect-4/3' : 'w-16 h-16 rounded shrink-0'
      )}>
        {displayImage ? (
          <motion.img
            src={displayImage}
            alt={item.title}
            className="w-full h-full object-cover"
            initial={false}
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: DURATION.normal }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Mini Gallery Navigation */}
        <AnimatePresence>
          {showGallery && (
            <MiniGallery
              images={item.images!}
              activeIndex={activeGalleryIndex}
              onIndexChange={setActiveGalleryIndex}
            />
          )}
        </AnimatePresence>

        {/* Quick Actions Overlay */}
        <AnimatePresence>
          {showQuickActions && (
            <QuickActions
              actions={quickActions}
              onAction={handleQuickAction}
              position="bottom"
              size="sm"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Content Area */}
      <div className={cn(
        viewMode === 'grid' ? 'p-3' : 'flex-1 min-w-0'
      )}>
        <h3 className="font-medium text-sm text-white truncate">
          {item.title}
        </h3>
        {item.subtitle && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Card Flip Reveal */}
      {showFlip && (
        <CardFlipReveal
          item={item}
          isFlipped={isFlipped}
          badges={effectiveBadges}
          renderBackContent={renderFlipContent}
        />
      )}

      {/* Expanded Preview Overlay */}
      <AnimatePresence>
        {showExpanded && (
          <ExpandedPreview
            item={item}
            badges={effectiveBadges}
            quickActions={quickActions}
            onQuickAction={handleQuickAction}
            onClose={() => setIsExpanded(false)}
            renderContent={renderExpandedContent}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default RichItemCard;
