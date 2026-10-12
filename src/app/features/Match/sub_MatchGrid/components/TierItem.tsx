"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { X, Play, Pause, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback } from 'react';

import { createUnifiedTierDragData } from '@/lib/dnd/unified-protocol';
import { useAudioStore } from '@/stores/audio-store';
import { BacklogItem } from '@/types/backlog-groups';

import { ControversyBadge } from './Debate/ControversyBadge';

export interface TierItemProps {
  item: BacklogItem;
  tierId: string;
  isMusicCategory: boolean;
  onRemove?: (itemId: string) => void;
  tierColor?: string;
  /** Debate mode: controversy info for this item */
  debateInfo?: { score: number; isHotTake: boolean; hasDebate: boolean } | null;
  /** Debate mode: callback to challenge this item's placement */
  onDebate?: (itemId: string, itemName: string) => void;
  /** Position index within the tier (used for drag data) */
  orderInTier?: number;
}

/**
 * Draggable item within a tier row
 * Uses unified protocol for drag data format.
 * Memoized to prevent re-renders when unrelated items change.
 */
export const TierItem = memo(function TierItem({
  item,
  tierId,
  isMusicCategory,
  onRemove,
  tierColor,
  debateInfo,
  onDebate,
  orderInTier = 0,
}: TierItemProps) {

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
          tier-item-card
          relative w-20 h-20 sm:w-24 sm:h-24 rounded-card overflow-hidden
          bg-slate-800/90 border border-slate-700/80
          transition-all duration-200 ease-out
          ${isDragging ? 'shadow-xl shadow-brand/30 scale-105 border-brand/50' : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/50'}
          ${isThisItemPlaying ? 'ring-2 ring-brand-hover/50 shadow-lg shadow-brand/20' : ''}
          cursor-grab active:cursor-grabbing
        `}
        style={{
          ...(tierColor && !isDragging ? {
            '--tier-color': tierColor,
            borderBottomColor: tierColor,
            borderBottomWidth: '2px',
            boxShadow: `inset 0 -2px 4px ${tierColor}1A`,
          } as React.CSSProperties : {}),
        }}
      >
        {/* Image */}
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={title}
            fill
            className="object-cover"
            draggable={false}
            unoptimized
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

export default TierItem;
