'use client';

/**
 * RichItemCard
 * Enhanced card component with expandable preview, quick actions,
 * metadata badges, and visual indicators.
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
import { cn } from '@/lib/utils';
import { QuickActions, QuickActionConfig } from './QuickActions';
import { MetadataBadges, MetadataBadgeData } from './MetadataBadges';
import { ExpandedPreview } from './ExpandedPreview';
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
  className,
  testId,
}: RichItemCardProps) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const containerRef = useRef<HTMLDivElement>(null);
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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

    if (config.expandTrigger === 'hover') {
      setIsExpanded(false);
    }
  }, [config]);

  // Handle click
  const handleClick = useCallback(() => {
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

      // Enter/Space to expand
      if (e.key === 'Enter' || e.key === ' ') {
        if (config.enableExpand) {
          e.preventDefault();
          setIsExpanded((prev) => !prev);
        }
      }

      // Escape to collapse
      if (e.key === 'Escape' && isExpanded) {
        e.preventDefault();
        setIsExpanded(false);
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
    [config, quickActions, handleQuickAction, isExpanded, item.images]
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

  // Determine if should show expanded view
  const showExpanded = isExpanded && !isDragging;
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
        'relative group rounded-lg overflow-hidden',
        'bg-gray-800 border border-gray-700',
        'transition-colors duration-200',
        isHovered && 'border-cyan-500/50',
        isSelected && 'ring-2 ring-cyan-500',
        isDragging && 'opacity-50 scale-95',
        isFocused && 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900',
        viewMode === 'grid' ? 'aspect-[4/5]' : 'flex items-center gap-3 p-2',
        className
      )}
      style={{ contain: 'layout style paint' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
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
        'relative overflow-hidden bg-gray-900',
        viewMode === 'grid' ? 'aspect-[4/3]' : 'w-16 h-16 rounded flex-shrink-0'
      )}>
        {displayImage ? (
          <motion.img
            src={displayImage}
            alt={item.title}
            className="w-full h-full object-cover"
            initial={false}
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.3 }}
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
