'use client';

/**
 * GeneratedItemsList
 *
 * Displays generated items in a compact grid layout (similar to match-test).
 * Each item shows image (3:4 ratio) and title with drag-and-drop reordering.
 */

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudioItems, useStudioGeneration, useStudioValidation } from '@/stores/studio-store';
import { StudioItemCard } from './StudioItemCard';
import { ListOrdered, GripVertical, Database } from 'lucide-react';

export function GeneratedItemsList() {
  const { generatedItems, removeItem, reorderItems } = useStudioItems();
  const { isGenerating } = useStudioGeneration();
  const { listSize } = useStudioValidation();

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

  // Count matched items
  const matchedCount = generatedItems.filter(item => item.db_matched).length;

  // Loading state - show grid skeletons
  if (isGenerating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg
            bg-gradient-to-br from-cyan-500/20 to-teal-500/10
            border border-cyan-500/20">
            <ListOrdered className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Generating items...</h3>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <ItemGridSkeleton key={i} delay={i * 0.05} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (generatedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-800/50 flex items-center justify-center mb-4">
          <ListOrdered className="w-8 h-8 text-gray-600" />
        </div>
        <p className="text-gray-400 text-sm">
          Enter a topic and generate items to get started
        </p>
      </div>
    );
  }

  const sortableIds = generatedItems.map((_, i) => `item-${i}`);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg
            bg-gradient-to-br from-cyan-500/20 to-teal-500/10
            border border-cyan-500/20">
            <ListOrdered className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            Items
            <span className="ml-2 text-sm font-normal text-gray-400">
              {generatedItems.length}/{listSize}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          {matchedCount > 0 && (
            <span className="flex items-center gap-1.5 text-green-400">
              <Database className="w-3.5 h-3.5" />
              {matchedCount} from DB
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5" />
            Drag to reorder
          </span>
        </div>
      </div>

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 gap-2">
            {generatedItems.map((item, index) => (
              <StudioItemCard
                key={`item-${index}`}
                item={item}
                index={index}
                onRemove={removeItem}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/**
 * Grid skeleton for loading state
 */
function ItemGridSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="aspect-[3/4] rounded-lg overflow-hidden animate-pulse"
      style={{ animationDelay: `${delay}s` }}
    >
      <Skeleton className="w-full h-full bg-gray-800/50" />
    </div>
  );
}
