'use client';

/**
 * GeneratedItemsList
 *
 * Displays the list of AI-generated items with drag-and-drop reordering,
 * inline editing, and manual item addition.
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
      <div className="space-y-4 mt-8">
        <h3 className="text-lg font-medium text-white">Generating items...</h3>
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state - show only add item form
  if (generatedItems.length === 0) {
    return (
      <div className="space-y-4 mt-8">
        <AddItemForm />
      </div>
    );
  }

  const sortableIds = generatedItems.map((_, i) => `item-${i}`);

  // Items list with drag-and-drop
  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">
          Items ({generatedItems.length})
        </h3>
        <p className="text-xs text-gray-500">Drag to reorder</p>
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
function ItemSkeleton() {
  return (
    <div className="flex gap-3 p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
      <Skeleton className="w-5 h-16 rounded flex-shrink-0" />
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
