'use client';

/**
 * StudioItemsView
 *
 * Sortable items grid for the studio with drag-and-drop reordering.
 * Supports progressive reveal animation when items stream in during generation.
 * Accepts configurable grid column breakpoints via `gridClassName` prop.
 */

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { SURFACE_ELEVATION } from '@/components/visual/depth/depth-tokens';
import { useStudioItems, useStudioGeneration, useStudioValidation, useStudioStore } from '@/stores/studio-store';
import { StudioItemCard } from './StudioItemCard';
import { ListOrdered, GripVertical, Database } from 'lucide-react';

const DEFAULT_GRID_CLASS = 'grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3';

interface StudioItemsViewProps {
  /** Custom grid column class (default: responsive 4-10 columns) */
  gridClassName?: string;
}

export function StudioItemsView({ gridClassName = DEFAULT_GRID_CLASS }: StudioItemsViewProps = {}) {
  const { generatedItems, removeItem, reorderItems, updateItem } = useStudioItems();
  const { isGenerating, generationProgress } = useStudioGeneration();
  const { listSize } = useStudioValidation();
  const category = useStudioStore((s) => s.category);

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
        <div className="w-16 h-16 rounded-2xl border border-gray-700/40 flex items-center justify-center mb-4"
          style={{ backgroundColor: SURFACE_ELEVATION.raised }}>
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

      {/* Loading Skeleton Grid (only when generating with no items yet) */}
      {isGenerating && generatedItems.length === 0 && (
        <div className={gridClassName}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-3/4 rounded-xl overflow-hidden animate-ambient-shimmer"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <Skeleton className="w-full h-full" style={{ backgroundColor: SURFACE_ELEVATION.raised }} />
            </div>
          ))}
        </div>
      )}

      {/* Items Grid -- shown during streaming and after completion */}
      {generatedItems.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
            <div className={gridClassName}>
              <AnimatePresence initial={false}>
                {generatedItems.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <StudioItemCard
                      item={item}
                      index={index}
                      onRemove={removeItem}
                      onUpdate={updateItem}
                      category={category}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Generation progress indicator */}
      {generationProgress && (
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-400">{generationProgress}</p>
        </div>
      )}
    </div>
  );
}

export default StudioItemsView;
