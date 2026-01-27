'use client';

/**
 * StudioItemCard
 *
 * Compact grid card showing image (3:4 aspect ratio) and title.
 * Similar to match-test grid items for consistent UX.
 * Supports drag-and-drop reordering, removal, and DB match indicator.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, ImageIcon, Database, GripVertical } from 'lucide-react';
import type { EnrichedItem } from '@/types/studio';
import { cn } from '@/lib/utils';
import { PlayButton } from '@/components/AudioPlayer';
import { useStudioMetadata } from '@/stores/studio-store';

interface StudioItemCardProps {
  item: EnrichedItem;
  index: number;
  onRemove: (index: number) => void;
}

export function StudioItemCard({ item, index, onRemove }: StudioItemCardProps) {
  const { category } = useStudioMetadata();
  const isMusicCategory = category?.toLowerCase() === 'music';

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

  // Rank badge colors
  const getRankStyle = () => {
    if (index === 0) return 'from-amber-500 to-amber-600 text-amber-900';
    if (index === 1) return 'from-slate-300 to-slate-400 text-slate-800';
    if (index === 2) return 'from-orange-400 to-orange-500 text-orange-900';
    return 'from-gray-600 to-gray-700 text-gray-200';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex flex-col rounded-lg overflow-hidden transition-all duration-200',
        'bg-gray-900/60 border border-gray-800/50',
        'hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10',
        isDragging && 'opacity-50 scale-105 shadow-2xl shadow-cyan-500/20 border-cyan-500/50 z-50'
      )}
    >
      {/* Image Container - 3:4 aspect ratio */}
      <div className="relative aspect-[3/4] bg-gray-800/50">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-600" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Rank badge - top left */}
        <div
          className={cn(
            'absolute top-2 left-2 w-7 h-7 rounded-md flex items-center justify-center',
            'bg-gradient-to-br font-bold text-sm shadow-lg',
            getRankStyle()
          )}
        >
          {index + 1}
        </div>

        {/* Top-right controls container */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {/* DB matched indicator */}
          {item.db_matched && (
            <div
              className="w-5 h-5 rounded flex items-center justify-center
                bg-green-500/20 border border-green-500/50"
              title="Matched with existing item"
            >
              <Database className="w-3 h-3 text-green-400" />
            </div>
          )}

          {/* Remove button - visible on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            className="w-5 h-5 rounded flex items-center justify-center
              bg-red-500/80 hover:bg-red-500 text-white
              opacity-0 group-hover:opacity-100 transition-all"
            title="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Drag handle - visible on hover */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
            cursor-grab active:cursor-grabbing transition-opacity
            bg-black/60 rounded-md p-1"
        >
          <GripVertical className="w-4 h-4 text-white" />
        </div>

        {/* Play button for Music - centered */}
        {isMusicCategory && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <PlayButton
              item={{
                id: item.db_item_id || `studio-item-${index}`,
                title: item.title,
                image_url: item.image_url,
                youtube_url: item.youtube_url,
                youtube_id: item.youtube_id,
              }}
              size="lg"
              className="bg-black/60 hover:bg-black/80"
            />
          </div>
        )}

        {/* Title at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <h4 className="text-sm font-medium text-white truncate leading-tight">
            {item.title}
          </h4>
        </div>
      </div>
    </div>
  );
}
