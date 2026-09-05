'use client';

/**
 * StudioItemCard
 *
 * Clean, compact grid card for studio items.
 * Supports drag-and-drop reordering, removal, inline title editing,
 * and DB match indicator.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { X, Database, GripVertical, Film, Music, Gamepad2, Globe, AlertCircle } from 'lucide-react';
import { memo, useState, useCallback, useRef } from 'react';


import { springConfig } from '@/app/features/Landing/shared/animations';
import { PlayButton } from '@/components/AudioPlayer';
import { PositionBadge } from '@/components/patterns/badges';
import { ProgressiveImage } from '@/components/ui/progressive-image';
import { Elevated } from '@/components/visual';
import { cn } from '@/lib/utils';

import type { EnrichedItem } from '@/types/studio';

/**
 * Local stacking context for card sub-elements.
 * Single source of truth — avoids scattered z-index values and stacking bugs.
 */
const CARD_Z = {
  shimmer: 5,      // enrichment shimmer overlay (below badges)
  badge: 10,       // rank badge, DB indicator, source badge
  playButton: 15,  // play button overlay, title bar
  handle: 20,      // drag handle
  action: 30,      // remove button (highest interactive)
  dragOverlay: 40, // drag-in-progress overlay (above all card content)
} as const;

/**
 * Resolves the enrichment source to a source-specific icon and label.
 * For 'enrichment_pipeline', inspects enriched_data.sources to pick the primary source icon.
 */
function getSourceBadge(item: EnrichedItem): { icon: React.ElementType; label: string; color: string } | null {
  const source = item.enrichment_source;
  if (!source || source === 'none') return null;

  if (source === 'database') {
    return { icon: Database, label: 'Matched from database', color: 'text-green-400 bg-green-500/20 border-green-500/40' };
  }

  if (source === 'wiki_fallback') {
    return { icon: Globe, label: 'Enriched from Wikipedia', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' };
  }

  // enrichment_pipeline — pick icon based on the primary data source
  const sources = item.enriched_data?.sources;
  if (sources?.includes('tmdb')) {
    return { icon: Film, label: 'Enriched from TMDB', color: 'text-sky-400 bg-sky-500/20 border-sky-500/40' };
  }
  if (sources?.includes('spotify')) {
    return { icon: Music, label: 'Enriched from Spotify', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' };
  }
  if (sources?.includes('igdb')) {
    return { icon: Gamepad2, label: 'Enriched from IGDB', color: 'text-purple-400 bg-purple-500/20 border-purple-500/40' };
  }
  if (sources?.includes('wikipedia')) {
    return { icon: Globe, label: 'Enriched from Wikipedia', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' };
  }

  // Generic pipeline badge
  return { icon: Database, label: 'Enriched', color: 'text-green-400 bg-green-500/20 border-green-500/40' };
}

interface StudioItemCardProps {
  item: EnrichedItem;
  index: number;
  onRemove: (index: number) => void;
  onUpdate?: (index: number, updates: Partial<EnrichedItem>) => void;
  category?: string;
}

export const StudioItemCard = memo(function StudioItemCard({ item, index, onRemove, onUpdate, category }: StudioItemCardProps) {
  const isMusicCategory = category?.toLowerCase() === 'music';
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(item.title);
    setIsEditing(true);
    // Focus input on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [item.title]);

  const handleTitleSave = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== item.title && onUpdate) {
      onUpdate(index, { title: trimmed });
    }
    setIsEditing(false);
  }, [editTitle, item.title, index, onUpdate]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(item.title);
      setIsEditing(false);
    }
  }, [handleTitleSave, item.title]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `item-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative', isDragging && 'z-drag')}
      data-testid={`studio-item-card-${index}`}
    >
      <Elevated
        level="medium"
        hoverLift
        className={cn(
          'group relative aspect-3/4 rounded-card overflow-hidden cursor-pointer border border-gray-700/30',
          isDragging && 'scale-105'
        )}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springConfig.section}
      >
        {/* Image with ProgressiveImage */}
        <div className="absolute inset-0">
          <ProgressiveImage
            src={item.image_url}
            alt={item.title}
            itemTitle={item.title}
            autoFetchWiki={!item.server_image_attempted}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            fallbackComponent={
              <div className="w-full h-full bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <span className="text-xs text-gray-500 text-center px-2">{item.title}</span>
              </div>
            }
          />
          {/* Gradient overlay for text visibility */}
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
        </div>

        {/* Enrichment shimmer overlay — shown while enrichment is in-flight */}
        {!item.enrichment_source && !item.server_image_attempted && (
          <div
            className="absolute inset-0 pointer-events-none animate-shimmer-slow"
            style={{
              zIndex: CARD_Z.shimmer,
              background: 'linear-gradient(105deg, transparent 30%, rgba(251,191,36,0.06) 45%, rgba(251,191,36,0.12) 50%, rgba(251,191,36,0.06) 55%, transparent 70%)',
              backgroundSize: '200% 100%',
            }}
          />
        )}

        {/* Source badge - top left: shows enrichment source or failure */}
        {(() => {
          const badge = getSourceBadge(item);
          if (badge) {
            const Icon = badge.icon;
            return (
              <div
                className={cn(
                  'absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center border backdrop-blur-xs',
                  badge.color
                )}
                style={{ zIndex: CARD_Z.badge }}
                role="img"
                aria-label={badge.label}
                title={badge.label}
              >
                <Icon className="w-2.5 h-2.5" />
              </div>
            );
          }
          // Enrichment failed or no source — show warning dot
          if (item.enrichment_source === 'none') {
            return (
              <div
                className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center
                  bg-amber-500/15 border border-amber-500/30 backdrop-blur-xs"
                style={{ zIndex: CARD_Z.badge }}
                role="img"
                aria-label="Enrichment failed — no data source matched"
                title="Enrichment failed"
              >
                <AlertCircle className="w-2.5 h-2.5 text-amber-400/70" />
              </div>
            );
          }
          // Legacy fallback: show db_matched badge if no enrichment_source is set
          if (item.db_matched) {
            return (
              <div
                className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center
                  bg-green-500/20 border border-green-500/40 backdrop-blur-xs"
                style={{ zIndex: CARD_Z.badge }}
                role="img"
                aria-label="Matched with existing database item"
              >
                <Database className="w-2.5 h-2.5 text-green-400" />
              </div>
            );
          }
          return null;
        })()}

        {/* Remove button - top right */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.3)' }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/70 hover:text-red-400
            backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ zIndex: CARD_Z.action }}
          aria-label={`Remove ${item.title} from list`}
          data-testid={`studio-item-remove-btn-${index}`}
        >
          <X className="w-3 h-3" />
        </motion.button>

        {/* Drag handle - bottom center */}
        <div
          {...attributes}
          {...listeners}
          role="button"
          tabIndex={0}
          aria-label={`Drag to reorder ${item.title}. Currently at position ${index + 1}`}
          aria-roledescription="draggable item"
          data-testid={`studio-item-drag-handle-${index}`}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
            cursor-grab active:cursor-grabbing transition-opacity
            bg-black/60 backdrop-blur-xs rounded-control p-1.5 border border-white/20
            focus-visible:opacity-100 focus-ring"
          style={{ zIndex: CARD_Z.handle }}
        >
          <GripVertical className="w-4 h-4 text-white" />
        </div>

        {/* Play button for Music - centered */}
        {isMusicCategory && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ zIndex: CARD_Z.playButton }}>
            <PlayButton
              item={{
                id: item.db_item_id || `studio-item-${index}`,
                title: item.title,
                image_url: item.image_url,
                youtube_url: item.youtube_url,
                youtube_id: item.youtube_id,
              }}
              size="lg"
              className="bg-black/60 hover:bg-black/80 backdrop-blur-xs"
            />
          </div>
        )}

        {/* Rank Badge - top left (below source badge if present) */}
        <div
          className={cn(
            'absolute left-1.5 opacity-0 group-hover:opacity-100 transition-opacity',
            (item.enrichment_source || item.db_matched) ? 'top-8' : 'top-1.5'
          )}
          style={{ zIndex: CARD_Z.badge }}
        >
          <PositionBadge position={index} size="xs" />
        </div>

        {/* Title at bottom - click to edit inline */}
        <div className="absolute bottom-0 left-0 right-0 p-2" style={{ zIndex: CARD_Z.playButton }}>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="w-full text-sm font-semibold text-white bg-black/60 backdrop-blur-sm
                border border-amber-500/50 rounded px-1.5 py-0.5 leading-tight
                focus:outline-hidden focus:border-amber-400"
              maxLength={100}
            />
          ) : (
            <h4
              onClick={handleTitleClick}
              title="Click to edit title"
              className="text-sm font-semibold text-white truncate leading-tight drop-shadow-lg
                cursor-text hover:text-amber-200 transition-colors"
            >
              {item.title}
            </h4>
          )}
        </div>

        {/* Active Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center rounded-card" style={{ zIndex: CARD_Z.dragOverlay }}>
            <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </div>
        )}
      </Elevated>
    </div>
  );
});
