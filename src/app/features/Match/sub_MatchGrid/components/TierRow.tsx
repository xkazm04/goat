"use client";

import { memo, useCallback, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, X, Play, Pause, Sparkles } from 'lucide-react';
import { ControversyBadge } from './Debate/ControversyBadge';
import { TierListTier } from '../../lib/tierPresets';
import { BacklogItem } from '@/types/backlog-groups';
import { createUnifiedTierRowDropData, createUnifiedTierDragData } from '@/lib/dnd/unified-protocol';
import { useOptionalDropZoneHighlight } from './DropZoneHighlightContext';
import { useCurrentList } from '@/stores/use-list-store';
import { extractTitle } from '@/lib/items/item-utils';
import { useAudioStore } from '@/stores/audio-store';
import { TierEmptyIllustration } from '@/components/illustrations/TierEmptyIllustration';

interface TierItemProps {
  item: BacklogItem;
  tierId: string;
  isMusicCategory: boolean;
  onRemove?: (itemId: string) => void;
  tierColor?: string;
  /** Debate mode: controversy info for this item */
  debateInfo?: { score: number; isHotTake: boolean; hasDebate: boolean } | null;
  /** Debate mode: callback to challenge this item's placement */
  onDebate?: (itemId: string, itemName: string) => void;
}

/**
 * Draggable item within a tier row
 * Uses unified protocol for drag data format.
 * Memoized to prevent re-renders when unrelated items change.
 */
const TierItem = memo(function TierItem({
  item,
  tierId,
  isMusicCategory,
  onRemove,
  tierColor,
  debateInfo,
  onDebate,
}: TierItemProps) {
  const orderInTier = 0;

  // Single consolidated audio selector — only re-renders when THIS item's state changes
  const { isPlaying: isThisItemPlaying, isLoading: isThisItemLoading } = useAudioStore(
    useCallback((state) => ({
      isPlaying: state.isPlaying && state.currentItem?.id === item.id,
      isLoading: state.isLoading && state.currentItem?.id === item.id,
    }), [item.id])
  );
  const play = useAudioStore((state) => state.play);
  const pause = useAudioStore((state) => state.pause);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isThisItemPlaying) {
      pause();
    } else {
      play({
        id: item.id,
        title: item.title || item.name || 'Unknown',
        image_url: item.image_url,
        youtube_url: item.youtube_url,
        youtube_id: item.youtube_id,
      });
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: createUnifiedTierDragData(item, tierId, orderInTier),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const title = item.title || item.name || 'Unknown';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`
        relative group shrink-0
        ${isDragging ? 'z-drag' : 'z-10'}
      `}
      {...attributes}
      {...listeners}
    >
      {/* Item card */}
      <div
        className={`
          relative w-20 h-20 sm:w-24 sm:h-24 rounded-card overflow-hidden
          bg-slate-800/90 border border-slate-700/80
          transition-all duration-200 ease-out
          ${isDragging ? 'shadow-xl shadow-brand/30 scale-105 border-brand/50' : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/50'}
          ${isThisItemPlaying ? 'ring-2 ring-brand-hover/50 shadow-lg shadow-brand/20' : ''}
          cursor-grab active:cursor-grabbing
        `}
        style={{
          ...(tierColor && !isDragging ? {
            borderBottomColor: tierColor,
            borderBottomWidth: '2px',
            boxShadow: `inset 0 -2px 4px ${tierColor}1A`,
          } : {}),
        }}
        onMouseEnter={(e) => {
          if (tierColor && !isDragging) {
            e.currentTarget.style.borderColor = `${tierColor}99`;
          }
        }}
        onMouseLeave={(e) => {
          if (tierColor && !isDragging) {
            e.currentTarget.style.borderColor = '';
            e.currentTarget.style.borderBottomColor = tierColor;
          }
        }}
      >
        {/* Image */}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={title}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-slate-700 to-slate-800">
            <span className="text-2xl font-bold text-slate-500">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />

        {/* Year badge */}
        {item.item_year && !isMusicCategory && (
          <span className="absolute top-1 right-1 z-10 text-3xs leading-tight font-medium text-white/90 bg-black/50 rounded-full px-1 py-px pointer-events-none">
            {item.item_year_to && item.item_year_to !== item.item_year
              ? `${item.item_year}–${item.item_year_to}`
              : item.item_year}
          </span>
        )}
        {/* Music category: year badge in bottom-right to avoid play button */}
        {item.item_year && isMusicCategory && (
          <span className="absolute bottom-6 right-0.5 z-10 text-3xs leading-tight font-medium text-white/90 bg-black/50 rounded-full px-1 py-px pointer-events-none">
            {item.item_year_to && item.item_year_to !== item.item_year
              ? `${item.item_year}–${item.item_year_to}`
              : item.item_year}
          </span>
        )}

        {/* Tags richness indicator */}
        {item.tags && item.tags.length > 0 && (
          <span className="absolute top-1.5 right-1.5 z-10 w-1.5 h-1.5 rounded-full bg-brand/70 pointer-events-none" style={item.item_year && !isMusicCategory ? { top: '1.25rem' } : undefined} />
        )}

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-1">
          <p className="text-tier-item font-medium text-white truncate text-center">
            {title}
          </p>
        </div>

        {/* Play button for Music category */}
        {isMusicCategory && (
          <button
            onClick={handlePlayClick}
            disabled={isThisItemLoading}
            aria-label={isThisItemPlaying ? `Pause ${title}` : `Play preview of ${title}`}
            aria-pressed={isThisItemPlaying}
            className={`
              absolute top-1 right-1 w-6 h-6 rounded-full
              flex items-center justify-center
              bg-brand/80 hover:bg-brand-hover
              opacity-0 group-hover:opacity-100 transition-all
              focus-visible:opacity-100 focus-ring
              ${isThisItemPlaying ? 'opacity-100 ring-2 ring-brand-hover' : ''}
              disabled:opacity-50
            `}
          >
            {isThisItemLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            ) : isThisItemPlaying ? (
              <Pause className="w-3 h-3 text-white" aria-hidden="true" />
            ) : (
              <Play className="w-3 h-3 text-white ml-0.5" aria-hidden="true" />
            )}
          </button>
        )}

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            aria-label={`Remove ${title} from tier`}
            className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500/80 focus-visible:opacity-100 focus-ring touch-target-sm"
          >
            <X className="w-3 h-3 text-white" aria-hidden="true" />
          </button>
        )}

        {/* Controversy badge (debate mode) */}
        {debateInfo && debateInfo.score > 0 && (
          <div className="absolute bottom-5 left-0.5 z-20">
            <ControversyBadge
              score={debateInfo.score}
              isHotTake={debateInfo.isHotTake}
              hasDebate={debateInfo.hasDebate}
              onClick={() => onDebate?.(item.id, title)}
              compact
            />
          </div>
        )}

        {/* Debate trigger button (shown on hover when debate mode is on) */}
        {onDebate && !debateInfo?.hasDebate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDebate(item.id, title);
            }}
            aria-label={`Challenge placement of ${title}`}
            className="absolute bottom-5 left-0.5 w-5 h-5 rounded-full bg-brand/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-brand focus-visible:opacity-100 focus-ring z-20 touch-target-sm"
          >
            <Sparkles className="w-3 h-3 text-white" aria-hidden="true" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

interface TierRowProps {
  tier: TierListTier;
  items: BacklogItem[];
  isOver?: boolean;
  onToggleCollapse?: (tierId: string) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditTier?: (tier: TierListTier) => void;
  isDraggingOver?: boolean;
  /** Index of this tier for accessibility */
  tierIndex?: number;
  /** Debate mode: per-item controversy data */
  debateInfoMap?: Map<string, { score: number; isHotTake: boolean; hasDebate: boolean }>;
  /** Debate mode: callback when user wants to debate an item */
  onDebateItem?: (itemId: string, itemName: string, tierId: string) => void;
}

/**
 * Single tier row with drop zone and sortable items
 * Uses unified protocol for drop target data.
 * Memoized to prevent re-renders when unrelated tiers change during drag.
 */
export const TierRow = memo(forwardRef<HTMLDivElement, TierRowProps>(function TierRow(
  {
    tier,
    items,
    onToggleCollapse,
    onRemoveItem,
    onEditTier,
    isDraggingOver,
    tierIndex = 0,
    debateInfoMap,
    onDebateItem,
  },
  ref
) {
  // Hoist category check once for all TierItems in this row
  const currentList = useCurrentList();
  const isMusicCategory = currentList?.category?.toLowerCase() === 'music';

  // Use unified protocol for drop data
  const { setNodeRef, isOver } = useDroppable({
    id: `tier-${tier.id}`,
    data: createUnifiedTierRowDropData(tier.id, tierIndex),
  });

  // Get drag state from context for magnetic glow effect
  const dropZoneContext = useOptionalDropZoneHighlight();
  const isParentDragging = dropZoneContext?.dragState?.isDragging ?? false;

  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  // Highlight when: hovered over, or parent is dragging (subtle glow)
  const isHighlighted = isOver || isDraggingOver;
  const showMagneticGlow = isParentDragging && !isHighlighted;

  const tierLabel = tier.customLabel || tier.label;

  // Compute background and text color based on custom color or tier colors
  const tierBackground = tier.customColor
    ? `linear-gradient(135deg, ${tier.customColor}, ${tier.customColor}cc)`
    : tier.color.gradient;

  // Calculate text color for custom colors (light text for dark backgrounds)
  const getTextColor = (bgColor?: string) => {
    if (!bgColor) return tier.color.text;
    // Simple luminance calculation
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const tierTextColor = tier.customColor ? getTextColor(tier.customColor) : tier.color.text;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex"
      role="listitem"
      aria-label={`${tierLabel} tier with ${items.length} items`}
    >
      {/* Tier label */}
      <div
        className="shrink-0 w-16 sm:w-20 flex flex-col items-center justify-center cursor-pointer hover:brightness-110 transition-all duration-200 focus-ring"
        style={{
          background: tierBackground,
          borderRadius: '8px 0 0 8px',
        }}
        onClick={() => onEditTier?.(tier)}
        role="button"
        aria-label={`Edit ${tierLabel} tier`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEditTier?.(tier);
          }
        }}
      >
        <span
          className="text-tier-label font-bold"
          style={{ color: tierTextColor }}
        >
          {tier.customLabel || tier.label}
        </span>
        {!tier.collapsed && items.length > 0 && (
          <span
            className="text-xs font-medium opacity-80"
            style={{ color: tierTextColor }}
          >
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => onToggleCollapse?.(tier.id)}
        aria-expanded={!tier.collapsed}
        aria-controls={`tier-items-${tier.id}`}
        aria-label={`${tier.collapsed ? 'Expand' : 'Collapse'} ${tierLabel} tier`}
        className="shrink-0 w-6 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/80 transition-all duration-200 focus-ring"
      >
        {tier.collapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
        )}
      </button>

      {/* Items container (drop zone) */}
      <div
        ref={setNodeRef}
        id={`tier-items-${tier.id}`}
        role="group"
        aria-label={`Items in ${tierLabel} tier`}
        className={`
          flex-1 min-h-24 p-3 relative
          bg-slate-900/70 backdrop-blur-xs border border-slate-700/40
          ${tier.collapsed ? 'overflow-hidden max-h-6' : ''}
          transition-all duration-200 ease-out
          ${isHighlighted ? 'bg-slate-800/90 shadow-inner' : ''}
          ${isParentDragging && !isHighlighted ? '' : ''}
        `}
        style={{
          borderRadius: '0 8px 8px 0',
          borderLeft: 'none',
          ...(isHighlighted ? {
            borderColor: `${tier.customColor || tier.color.primary}80`,
            boxShadow: `inset 0 0 12px ${tier.customColor || tier.color.primary}15`,
          } : showMagneticGlow ? {
            borderColor: `${tier.customColor || tier.color.primary}40`,
            boxShadow: `0 0 8px ${tier.customColor || tier.color.primary}08`,
          } : {}),
          ...(isParentDragging ? {
            animation: 'tierPulse 2s ease-in-out infinite',
            outlineColor: `${tier.customColor || tier.color.primary}30`,
          } : {}),
        }}
      >
        <AnimatePresence mode="popLayout">
          {tier.collapsed ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-slate-500 truncate"
            >
              {items.length} items hidden
            </motion.div>
          ) : items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`
                h-full flex items-center justify-center text-xs
                border border-dashed border-slate-700/50 rounded-card
                ${isHighlighted ? 'border-opacity-50' : ''}
              `}
              style={isHighlighted ? {
                borderColor: `${tier.customColor || tier.color.primary}50`,
              } : undefined}
            >
              <TierEmptyIllustration
                tierLabel={tier.customLabel || tier.label}
                color={tier.customColor || tier.color.primary}
                isHighlighted={isHighlighted}
              />
            </motion.div>
          ) : (
            <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <TierItem
                    key={item.id}
                    item={item}
                    tierId={tier.id}
                    isMusicCategory={isMusicCategory}
                    onRemove={onRemoveItem}
                    tierColor={tier.customColor || tier.color.primary}
                    debateInfo={debateInfoMap?.get(item.id) ?? null}
                    onDebate={onDebateItem ? (itemId, itemName) => onDebateItem(itemId, itemName, tier.id) : undefined}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}));

/**
 * Unranked items pool at the bottom
 * Uses unified protocol for drop target
 */
interface UnrankedPoolProps {
  items: BacklogItem[];
  onAddToTier?: (itemId: string, tierId: string) => void;
}

export function UnrankedPool({ items }: UnrankedPoolProps) {
  const currentList = useCurrentList();
  const isMusicCategory = currentList?.category?.toLowerCase() === 'music';

  // Use unified protocol for drop data
  const { setNodeRef, isOver } = useDroppable({
    id: 'unranked-pool',
    data: {
      type: 'unranked-pool',
    },
  });

  // Get drag state from context for magnetic glow effect
  const dropZoneContext = useOptionalDropZoneHighlight();
  const isParentDragging = dropZoneContext?.dragState?.isDragging ?? false;
  const showMagneticGlow = isParentDragging && !isOver;

  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-base font-bold text-slate-400">
          Unranked Items
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-500">
          {items.length}
        </span>
      </div>

      {/* Pool container */}
      <div
        ref={setNodeRef}
        className={`
          min-h-24 p-4 rounded-container
          bg-slate-900/40 backdrop-blur-xs border-2 border-dashed
          ${isOver ? 'border-brand/50 bg-brand/5 shadow-inner shadow-brand/5' : 'border-slate-700/40'}
          ${showMagneticGlow ? 'border-brand/25 shadow-lg shadow-brand/5' : ''}
          transition-all duration-200 ease-out
        `}
      >
        <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <TierItem
                  key={item.id}
                  item={item}
                  tierId="unranked"
                  isMusicCategory={isMusicCategory}
                />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </div>
    </motion.div>
  );
}

export default TierRow;
