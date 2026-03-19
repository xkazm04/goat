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
import { X, Database, GripVertical } from 'lucide-react';
import { memo, useState, useCallback, useRef } from 'react';


import { springConfig } from '@/app/features/Landing/shared/animations';
import { PlayButton } from '@/components/AudioPlayer';
import { PositionBadge } from '@/components/patterns/badges';
import { ProgressiveImage } from '@/components/ui/progressive-image';
import { Elevated } from '@/components/visual';
import { cn } from '@/lib/utils';

import type { EnrichedItem } from '@/types/studio';

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
  } = useSortable({ id: `item-${item.db_item_id || item.title}` });

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

        {/* DB matched indicator - top left */}
        {item.db_matched && (
          <div
            className="absolute top-1.5 left-1.5 z-20 w-5 h-5 rounded-full flex items-center justify-center
              bg-green-500/20 border border-green-500/40 backdrop-blur-xs"
            role="img"
            aria-label="Matched with existing database item"
          >
            <Database className="w-2.5 h-2.5 text-green-400" />
          </div>
        )}

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
            backdrop-blur-md border border-white/20 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
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
            cursor-grab active:cursor-grabbing transition-opacity z-20
            bg-black/60 backdrop-blur-xs rounded-control p-1.5 border border-white/20
            focus-visible:opacity-100 focus-ring"
        >
          <GripVertical className="w-4 h-4 text-white" />
        </div>

        {/* Play button for Music - centered */}
        {isMusicCategory && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-15">
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

        {/* Rank Badge - top right */}
        <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <PositionBadge position={index} size="xs" />
        </div>

        {/* Title at bottom - click to edit inline */}
        <div className="absolute bottom-0 left-0 right-0 p-2 z-15">
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-sticky rounded-card">
            <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </div>
        )}
      </Elevated>
    </div>
  );
});
