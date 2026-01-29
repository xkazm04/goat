"use client";

import { useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, X, Play, Pause } from 'lucide-react';
import { TierListTier, CommunityTierConsensus } from '../../lib/tierPresets';
import { BacklogItem } from '@/types/backlog-groups';
import { createUnifiedTierRowDropData, createUnifiedTierDragData } from '@/lib/dnd/unified-protocol';
import { useOptionalDropZoneHighlight } from './DropZoneHighlightContext';
import { useCurrentList } from '@/stores/use-list-store';
import { useAudioStore, useIsItemPlaying } from '@/stores/audio-store';

interface TierItemProps {
  item: BacklogItem;
  tierId: string;
  showCommunityTier?: boolean;
  communityTier?: string;
  onRemove?: (itemId: string) => void;
}

/**
 * Draggable item within a tier row
 * Uses unified protocol for drag data format
 */
function TierItem({
  item,
  tierId,
  showCommunityTier,
  communityTier,
  onRemove,
}: TierItemProps) {
  // Get item's index within the tier for unified protocol
  const orderInTier = 0; // Will be derived from actual position when dragging

  // Check if Music category for play button
  const currentList = useCurrentList();
  const isMusicCategory = currentList?.category?.toLowerCase() === 'music';

  // Audio playback state
  const play = useAudioStore((state) => state.play);
  const pause = useAudioStore((state) => state.pause);
  const isLoading = useAudioStore((state) => state.isLoading);
  const currentItem = useAudioStore((state) => state.currentItem);
  const isThisItemPlaying = useIsItemPlaying(item.id);
  const isThisItemCurrent = currentItem?.id === item.id;
  const isThisItemLoading = isThisItemCurrent && isLoading;

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
    // Use unified protocol data format
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
        relative group flex-shrink-0
        ${isDragging ? 'z-50' : 'z-10'}
      `}
      {...attributes}
      {...listeners}
    >
      {/* Item card */}
      <div
        className={`
          relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden
          bg-slate-800 border border-slate-700
          transition-all duration-200
          ${isDragging ? 'shadow-xl shadow-cyan-500/30 scale-105' : 'hover:border-slate-500 hover:shadow-lg'}
          ${isThisItemPlaying ? 'ring-2 ring-cyan-400/50' : ''}
          cursor-grab active:cursor-grabbing
        `}
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <span className="text-2xl font-bold text-slate-500">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-1">
          <p className="text-[10px] font-medium text-white truncate text-center">
            {title}
          </p>
        </div>

        {/* Community tier indicator */}
        {showCommunityTier && communityTier && (
          <div
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-black/60 border border-white/30"
            aria-label={`Community consensus: ${communityTier} tier`}
            role="img"
          >
            {communityTier}
          </div>
        )}

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
              bg-cyan-500/80 hover:bg-cyan-400
              opacity-0 group-hover:opacity-100 transition-all
              focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300
              ${isThisItemPlaying ? 'opacity-100 ring-2 ring-cyan-300' : ''}
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
            className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <X className="w-3 h-3 text-white" aria-hidden="true" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

interface TierRowProps {
  tier: TierListTier;
  items: BacklogItem[];
  isOver?: boolean;
  onToggleCollapse?: (tierId: string) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditTier?: (tier: TierListTier) => void;
  showCommunityComparison?: boolean;
  communityConsensus?: Map<string, CommunityTierConsensus>;
  isDraggingOver?: boolean;
}

/**
 * Single tier row with drop zone and sortable items
 * Uses unified protocol for drop target data
 */
export const TierRow = forwardRef<HTMLDivElement, TierRowProps>(function TierRow(
  {
    tier,
    items,
    onToggleCollapse,
    onRemoveItem,
    onEditTier,
    showCommunityComparison,
    communityConsensus,
    isDraggingOver,
  },
  ref
) {
  // Get tier index for unified protocol (0-based)
  const tierIndex = 0; // Will be computed by parent if needed

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

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex"
    >
      {/* Tier label */}
      <div
        className="flex-shrink-0 w-16 sm:w-20 flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
        style={{
          background: tier.customColor || tier.color.gradient,
          borderRadius: '8px 0 0 8px',
        }}
        onClick={() => onEditTier?.(tier)}
      >
        <span
          className="text-xl sm:text-2xl font-black"
          style={{ color: tier.color.text }}
        >
          {tier.customLabel || tier.label}
        </span>
        {!tier.collapsed && items.length > 0 && (
          <span
            className="text-[10px] font-medium opacity-80"
            style={{ color: tier.color.text }}
          >
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => onToggleCollapse?.(tier.id)}
        aria-expanded={!tier.collapsed}
        aria-label={`${tier.collapsed ? 'Expand' : 'Collapse'} ${tier.customLabel || tier.label} tier`}
        className="flex-shrink-0 w-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-inset"
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
        className={`
          flex-1 min-h-[88px] sm:min-h-[104px] p-2
          bg-slate-900/80 border border-slate-700/50
          ${tier.collapsed ? 'overflow-hidden max-h-6' : ''}
          transition-all duration-200
          ${isHighlighted ? 'bg-slate-800 border-cyan-500/50 shadow-inner shadow-cyan-500/10' : ''}
          ${showMagneticGlow ? 'border-cyan-500/20 shadow-lg shadow-cyan-500/5' : ''}
        `}
        style={{
          borderRadius: '0 8px 8px 0',
          borderLeft: 'none',
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
              animate={{ opacity: 0.5 }}
              className={`
                h-full flex items-center justify-center text-sm
                ${isHighlighted ? 'text-cyan-400' : 'text-slate-600'}
              `}
            >
              {isHighlighted ? 'Drop here' : 'Drag items here'}
            </motion.div>
          ) : (
            <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => {
                  const consensus = communityConsensus?.get(item.id);
                  return (
                    <TierItem
                      key={item.id}
                      item={item}
                      tierId={tier.id}
                      showCommunityTier={showCommunityComparison}
                      communityTier={consensus?.consensusTier}
                      onRemove={onRemoveItem}
                    />
                  );
                })}
              </div>
            </SortableContext>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

/**
 * Unranked items pool at the bottom
 * Uses unified protocol for drop target
 */
interface UnrankedPoolProps {
  items: BacklogItem[];
  onAddToTier?: (itemId: string, tierId: string) => void;
}

export function UnrankedPool({ items }: UnrankedPoolProps) {
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
        <h3 className="text-sm font-semibold text-slate-400">
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
          min-h-[100px] p-4 rounded-xl
          bg-slate-900/50 border-2 border-dashed
          ${isOver ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-700/50'}
          ${showMagneticGlow ? 'border-cyan-500/20 shadow-lg shadow-cyan-500/5' : ''}
          transition-all duration-200
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
