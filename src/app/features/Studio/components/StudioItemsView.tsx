'use client';

/**
 * StudioItemsView
 *
 * Items grid view for the studio - displays generated items with drag-and-drop reordering.
 * Extracted from StudioItemsGrid for use within StudioContentTabs.
 */

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudioItems, useStudioGeneration, useStudioValidation } from '@/stores/studio-store';
import { StudioItemCard } from './StudioItemCard';
import { ListOrdered, GripVertical, Database } from 'lucide-react';

export function StudioItemsView() {
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

  const matchedCount = generatedItems.filter(item => item.db_matched).length;
  const sortableIds = generatedItems.map((_, i) => `item-${i}`);

  // Empty state
  if (!isGenerating && generatedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-800/50 border border-gray-700/40 flex items-center justify-center mb-4">
          <ListOrdered className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-gray-500 text-sm">
          Enter a topic and generate items to get started
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-medium text-gray-300">
            {isGenerating ? 'Generating...' : `${generatedItems.length}/${listSize} items`}
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {matchedCount > 0 && (
            <span className="flex items-center gap-1.5 text-green-400">
              <Database className="w-3.5 h-3.5" />
              {matchedCount} from DB
            </span>
          )}
          {generatedItems.length > 0 && (
            <span className="flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5" />
              Drag to reorder
            </span>
          )}
        </div>
      </div>

      {/* Loading Grid */}
      {isGenerating && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-xl overflow-hidden animate-pulse"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <Skeleton className="w-full h-full bg-gray-800/50" />
            </div>
          ))}
        </div>
      )}

      {/* Items Grid */}
      {!isGenerating && generatedItems.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
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
      )}
    </div>
  );
}

export default StudioItemsView;
