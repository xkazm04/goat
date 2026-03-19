'use client';

/**
 * StudioItemsView
 *
 * Sortable items grid with:
 * - GoatMascot branded empty state
 * - Staggered spring entrance animation for streaming items
 * - Animated generation skeleton with gradient sweep
 */

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { DURATION } from '@/lib/animations/motion-presets';
import { SURFACE_ELEVATION } from '@/components/visual/depth/depth-tokens';
import { useStudioItems, useStudioGeneration, useStudioValidation, useStudioStore } from '@/stores/studio-store';
import { StudioItemCard } from './StudioItemCard';
import { GripVertical, Database, Crown } from 'lucide-react';
import { GoatMascot } from '@/components/visual/GoatMascot';

const DEFAULT_GRID_CLASS = 'grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3';

interface StudioItemsViewProps {
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

  const sortableIds = generatedItems.map((item) =>
    `item-${item.db_item_id || item.title}`
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderItems(oldIndex, newIndex);
    }
  };

  const matchedCount = generatedItems.filter(item => item.db_matched).length;

  // Empty state with mascot
  if (!isGenerating && generatedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: DURATION.slow, ease: [0.23, 1, 0.32, 1] }}
        >
          <GoatMascot variant="waving" size={100} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: DURATION.normal }}
          className="text-gray-500 text-sm mt-4"
        >
          Your generated items will appear here
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: DURATION.normal }}
          className="text-gray-600 text-xs mt-1"
        >
          Enter a topic above and hit Generate to get started
        </motion.p>
      </div>
    );
  }

  return (
    <div>
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-medium text-gray-300">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                </span>
                <span className="text-amber-400">Generating...</span>
              </span>
            ) : (
              <span>
                <span className="text-white font-semibold">{generatedItems.length}</span>
                <span className="text-gray-500">/{listSize} items</span>
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {matchedCount > 0 && (
            <span className="flex items-center gap-1.5 text-green-400/80">
              <Database className="w-3.5 h-3.5" />
              {matchedCount} from DB
            </span>
          )}
          {generatedItems.length > 0 && (
            <span className="flex items-center gap-1.5 text-gray-600">
              <GripVertical className="w-3.5 h-3.5" />
              Drag to reorder
            </span>
          )}
        </div>
      </div>

      {/* Branded loading skeleton */}
      {isGenerating && generatedItems.length === 0 && (
        <div className="space-y-6">
          <div className="flex flex-col items-center py-4">
            <div className="relative">
              <Crown className="w-10 h-10 text-amber-400 animate-pulse" />
              <div className="absolute inset-0 w-10 h-10 rounded-full bg-amber-400/20 animate-ping" />
            </div>
            <p className="mt-3 text-sm font-medium bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Summoning the G.O.A.T.s...
            </p>
          </div>
          <div className={gridClassName}>
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: DURATION.normal }}
                className="aspect-3/4 rounded-card overflow-hidden border border-amber-500/10"
              >
                <div className="w-full h-full relative" style={{ backgroundColor: SURFACE_ELEVATION.raised }}>
                  {/* Shimmer sweep */}
                  <div
                    className="absolute inset-0 animate-shimmer-slow"
                    style={{
                      background: 'linear-gradient(105deg, transparent 30%, rgba(251,191,36,0.06) 45%, rgba(251,191,36,0.1) 50%, rgba(251,191,36,0.06) 55%, transparent 70%)',
                      backgroundSize: '200% 100%',
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Items Grid with staggered entrance */}
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
                    initial={{ opacity: 0, scale: 0.85, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                      delay: Math.min(index * 0.03, 0.3),
                    }}
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

      {/* Generation progress */}
      {generationProgress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center"
        >
          <p className="text-sm font-medium bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            {generationProgress}
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default StudioItemsView;
