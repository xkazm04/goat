'use client';

/**
 * GeneratedItemsList
 *
 * Displays the list of AI-generated items with drag-and-drop reordering,
 * inline editing, and manual item addition.
 * Features premium styling with gradients and animations.
 */

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudioItems, useStudioGeneration } from '@/stores/studio-store';
import { EditableItemCard } from './EditableItemCard';
import { AddItemForm } from './AddItemForm';
import { ListOrdered, GripVertical } from 'lucide-react';

export function GeneratedItemsList() {
  const { generatedItems, updateItem, removeItem, reorderItems } =
    useStudioItems();
  const { isGenerating } = useStudioGeneration();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = parseInt(String(active.id).replace('item-', ''), 10);
    const newIndex = parseInt(String(over.id).replace('item-', ''), 10);
    reorderItems(oldIndex, newIndex);
  };

  // Loading state - show skeletons
  if (isGenerating) {
    return (
      <div className="space-y-4 mt-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg
            bg-gradient-to-br from-cyan-500/20 to-purple-500/10
            border border-cyan-500/20">
            <ListOrdered className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Generating items...</h3>
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ItemSkeleton key={i} delay={i * 0.1} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state - show only add item form
  if (generatedItems.length === 0) {
    return (
      <div className="space-y-4 mt-10">
        <AddItemForm />
      </div>
    );
  }

  const sortableIds = generatedItems.map((_, i) => `item-${i}`);

  // Items list with drag-and-drop
  return (
    <div className="space-y-4 mt-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg
            bg-gradient-to-br from-cyan-500/20 to-purple-500/10
            border border-cyan-500/20">
            <ListOrdered className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            Items
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({generatedItems.length})
            </span>
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <GripVertical className="w-3.5 h-3.5" />
          <span>Drag to reorder</span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-3">
            {generatedItems.map((item, index) => (
              <EditableItemCard
                key={`item-${index}`}
                item={item}
                index={index}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Item Form */}
      <AddItemForm />
    </div>
  );
}

/**
 * Loading skeleton for an item card
 */
function ItemSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex gap-3 p-4 bg-gray-900/40 border border-gray-800/50 rounded-xl animate-pulse"
      style={{ animationDelay: `${delay}s` }}
    >
      <Skeleton className="w-5 h-16 rounded bg-gray-800/50" />
      <Skeleton className="w-10 h-10 rounded-lg bg-gray-800/50" />
      <Skeleton className="w-16 h-16 rounded-lg bg-gray-800/50" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4 bg-gray-800/50" />
        <Skeleton className="h-4 w-full bg-gray-800/50" />
        <Skeleton className="h-4 w-1/2 bg-gray-800/50" />
      </div>
    </div>
  );
}
