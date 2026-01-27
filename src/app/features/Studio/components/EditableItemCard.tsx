'use client';

/**
 * EditableItemCard
 *
 * Premium item card with inline editing, remove action, and drag handle for reordering.
 * Features gradient borders, glow effects, and smooth animations.
 */

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Check, X, ExternalLink, ImageIcon } from 'lucide-react';
import type { EnrichedItem } from '@/types/studio';
import { cn } from '@/lib/utils';

interface EditableItemCardProps {
  item: EnrichedItem;
  index: number;
  onUpdate: (index: number, updates: Partial<EnrichedItem>) => void;
  onRemove: (index: number) => void;
}

export function EditableItemCard({
  item,
  index,
  onUpdate,
  onRemove,
}: EditableItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description);

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

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onUpdate(index, {
      title: editTitle.trim(),
      description: editDescription.trim(),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(item.title);
    setEditDescription(item.description);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Determine rank color based on position
  const getRankStyle = () => {
    if (index === 0) return { bg: 'from-amber-500/30 to-amber-600/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    if (index === 1) return { bg: 'from-slate-400/30 to-slate-500/10', text: 'text-slate-300', border: 'border-slate-400/30' };
    if (index === 2) return { bg: 'from-orange-500/30 to-orange-600/10', text: 'text-orange-400', border: 'border-orange-500/30' };
    return { bg: 'from-cyan-500/20 to-purple-500/10', text: 'text-cyan-400', border: 'border-gray-700/50' };
  };

  const rankStyle = getRankStyle();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex gap-3 p-4 rounded-xl transition-all duration-300',
        'bg-gray-900/60 backdrop-blur-sm',
        'border hover:border-gray-600/50',
        isDragging
          ? 'opacity-50 shadow-2xl shadow-cyan-500/20 border-cyan-500/50 scale-[1.02]'
          : 'border-gray-800/50'
      )}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-purple-500/5
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="relative flex-shrink-0 cursor-grab active:cursor-grabbing
          text-gray-600 hover:text-gray-400 transition-colors
          flex items-center"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Rank Badge */}
      <div
        className={cn(
          'relative flex-shrink-0 w-10 h-10 flex items-center justify-center',
          'bg-gradient-to-br rounded-lg border',
          rankStyle.bg,
          rankStyle.border
        )}
      >
        <span className={cn('text-sm font-black', rankStyle.text)}>
          {index + 1}
        </span>
      </div>

      {/* Image */}
      {item.image_url ? (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0
          border border-gray-700/50 group/img">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300
              group-hover/img:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      ) : (
        <div
          className="w-16 h-16 bg-gray-800/50 rounded-lg flex-shrink-0
            flex items-center justify-center border border-gray-700/50"
        >
          <ImageIcon className="w-6 h-6 text-gray-600" />
        </div>
      )}

      {/* Content */}
      <div className="relative flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Item title"
              autoFocus
              className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600
                rounded-lg text-white text-sm
                focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50
                transition-all"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Description"
              rows={2}
              className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600
                rounded-lg text-white text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50
                transition-all"
            />
          </div>
        ) : (
          <>
            <h4 className="font-semibold text-white truncate pr-2">{item.title}</h4>
            <p className="text-sm text-gray-400 line-clamp-2 mt-1">
              {item.description}
            </p>
            {item.wikipedia_url && (
              <a
                href={item.wikipedia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-400
                  hover:text-cyan-300 mt-2 transition-colors group/link"
              >
                <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                Wikipedia
              </a>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="relative flex-shrink-0 flex items-start gap-1">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={!editTitle.trim()}
              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10
                rounded-lg transition-all disabled:opacity-50"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50
                rounded-lg transition-all"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10
                rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove(index)}
              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10
                rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
