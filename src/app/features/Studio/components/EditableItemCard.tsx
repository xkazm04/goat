'use client';

/**
 * EditableItemCard
 *
 * Item card with inline editing, remove action, and drag handle for reordering.
 */

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Check, X, ExternalLink } from 'lucide-react';
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex gap-3 p-4 bg-gray-900/50 border border-gray-800 rounded-xl',
        'hover:border-gray-700 transition-all group',
        isDragging && 'opacity-50 shadow-lg shadow-cyan-500/20 border-cyan-500/50'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing
          text-gray-600 hover:text-gray-400 transition-colors
          flex items-center"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Rank Badge */}
      <div
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center
          bg-gradient-to-br from-cyan-500/20 to-purple-500/20
          border border-gray-700/50 rounded-lg"
      >
        <span className="text-sm font-bold text-cyan-400">{index + 1}</span>
      </div>

      {/* Image */}
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.title}
          className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-gray-800"
          loading="lazy"
        />
      ) : (
        <div
          className="w-16 h-16 bg-gray-800 rounded-lg flex-shrink-0
            flex items-center justify-center"
        >
          <span className="text-xl">🎯</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Item title"
              autoFocus
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600
                rounded text-white text-sm
                focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Description"
              rows={2}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600
                rounded text-white text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        ) : (
          <>
            <h4 className="font-medium text-white truncate">{item.title}</h4>
            <p className="text-sm text-gray-400 line-clamp-2 mt-1">
              {item.description}
            </p>
            {item.wikipedia_url && (
              <a
                href={item.wikipedia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-400
                  hover:text-cyan-300 mt-1 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Wikipedia
              </a>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-start gap-1">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={!editTitle.trim()}
              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10
                rounded-lg transition-colors disabled:opacity-50"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700
                rounded-lg transition-colors"
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
                rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove(index)}
              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10
                rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
