'use client';

/**
 * TierRankingMode
 * Alternative ranking mode where users drag items directly into tiers
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TierDefinition } from '@/lib/tiers/types';
import {
  TierConverter,
  TierAssignment,
  TierItem,
  ConversionStrategy,
  createTierConverter,
  convertTiersToPositions,
} from '@/lib/tiers/TierConverter';
import {
  TierRow,
  isTierRowDropData,
  isTierItemDragData,
  TierRowDropData,
  TierItemDragData,
} from '@/lib/tiers/TierRow';
import { getBestPresetForSize, TIER_PRESETS } from '@/lib/tiers/constants';
import { createTiersFromBoundaries, calculateTierBoundaries } from '@/lib/tiers/TierCalculator';
import { LayoutGrid, List, Settings, RotateCcw, Download, Plus, Minus } from 'lucide-react';

/**
 * Item data structure for tier ranking
 */
interface RankableItem {
  id: string;
  title: string;
  image_url?: string | null;
  description?: string;
}

/**
 * Mode toggle options
 */
type RankingMode = 'tier' | 'position';

/**
 * Props for TierRankingMode
 */
interface TierRankingModeProps {
  /** List ID */
  listId: string;
  /** Total list size */
  listSize: number;
  /** Items available to rank */
  availableItems: RankableItem[];
  /** Initial tier assignments (if resuming) */
  initialAssignments?: TierAssignment[];
  /** Initial mode */
  initialMode?: RankingMode;
  /** Called when assignments change */
  onAssignmentsChange?: (assignments: TierAssignment[]) => void;
  /** Called when mode changes */
  onModeChange?: (mode: RankingMode) => void;
  /** Called when converting to positions */
  onConvertToPositions?: (positions: Array<{ itemId: string; position: number }>) => void;
  /** Conversion strategy */
  conversionStrategy?: ConversionStrategy;
  /** Allow tier capacity limits */
  enableCapacityLimits?: boolean;
  /** Allow tier customization */
  enableTierCustomization?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * State for tier ranking mode
 */
interface TierRankingState {
  assignments: TierAssignment[];
  tiers: TierDefinition[];
  tierCount: number;
  mode: RankingMode;
  isDragging: boolean;
  draggedItem: RankableItem | null;
  hoveredTierId: string | null;
}

/**
 * TierRankingMode component
 */
export function TierRankingMode({
  listId,
  listSize,
  availableItems,
  initialAssignments,
  initialMode = 'tier',
  onAssignmentsChange,
  onModeChange,
  onConvertToPositions,
  conversionStrategy = 'preserve-order',
  enableCapacityLimits = false,
  enableTierCustomization = true,
  className,
}: TierRankingModeProps) {
  // Get best preset for list size
  const preset = useMemo(() => getBestPresetForSize(listSize), [listSize]);

  // Initialize state
  const [state, setState] = useState<TierRankingState>(() => {
    const tierCount = preset.tierCount || 5;
    const boundaries = calculateTierBoundaries(listSize, tierCount, 'pyramid');
    const tiers = createTiersFromBoundaries(boundaries, preset);

    // Initialize empty assignments if not provided
    const assignments = initialAssignments || tiers.map((tier, index) => ({
      tierId: tier.id,
      tierLabel: tier.label,
      tierIndex: index,
      items: [],
      capacity: enableCapacityLimits ? tier.endPosition - tier.startPosition : undefined,
    }));

    return {
      assignments,
      tiers,
      tierCount,
      mode: initialMode,
      isDragging: false,
      draggedItem: null,
      hoveredTierId: null,
    };
  });

  // Create converter
  const converter = useMemo(
    () =>
      createTierConverter({
        strategy: conversionStrategy,
        listSize,
        tiers: state.tiers,
      }),
    [conversionStrategy, listSize, state.tiers]
  );

  // Get unassigned items (items not in any tier)
  const unassignedItems = useMemo(() => {
    const assignedIds = new Set(
      state.assignments.flatMap((a) => a.items.map((i) => i.itemId))
    );
    return availableItems.filter((item) => !assignedIds.has(item.id));
  }, [availableItems, state.assignments]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;

    // Check if dragging from backlog (collection-item or backlog-item)
    if (data?.type === 'collection-item' || data?.type === 'backlog-item') {
      const item = data.item;
      setState((prev) => ({
        ...prev,
        isDragging: true,
        draggedItem: {
          id: item.id,
          title: item.title || item.name,
          image_url: item.image_url,
        },
      }));
    }
    // Check if dragging from within tiers
    else if (isTierItemDragData(data)) {
      setState((prev) => ({
        ...prev,
        isDragging: true,
        draggedItem: data.item,
      }));
    }
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overData = event.over?.data.current;

    if (isTierRowDropData(overData)) {
      setState((prev) => ({
        ...prev,
        hoveredTierId: overData.tierId,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        hoveredTierId: null,
      }));
    }
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setState((prev) => ({
        ...prev,
        isDragging: false,
        draggedItem: null,
        hoveredTierId: null,
      }));

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      // Dropping onto a tier row
      if (isTierRowDropData(overData)) {
        const targetTierId = overData.tierId;

        // From backlog/collection
        if (activeData?.type === 'collection-item' || activeData?.type === 'backlog-item') {
          const item = activeData.item;
          addItemToTier(item.id, item.title || item.name, item.image_url, targetTierId);
        }
        // From another tier
        else if (isTierItemDragData(activeData)) {
          if (activeData.tierId !== targetTierId) {
            moveItemBetweenTiers(activeData.itemId, activeData.tierId, targetTierId);
          }
        }
      }
    },
    []
  );

  // Add item to tier
  const addItemToTier = useCallback(
    (itemId: string, title: string, imageUrl: string | null | undefined, tierId: string) => {
      setState((prev) => {
        const newAssignments = prev.assignments.map((assignment) => {
          if (assignment.tierId === tierId) {
            // Check capacity
            if (
              assignment.capacity !== undefined &&
              assignment.items.length >= assignment.capacity
            ) {
              return assignment;
            }

            // Check if item already in tier
            if (assignment.items.some((i) => i.itemId === itemId)) {
              return assignment;
            }

            return {
              ...assignment,
              items: [
                ...assignment.items,
                {
                  itemId,
                  tierId,
                  orderInTier: assignment.items.length,
                },
              ],
            };
          }
          return assignment;
        });

        return { ...prev, assignments: newAssignments };
      });
    },
    []
  );

  // Move item between tiers
  const moveItemBetweenTiers = useCallback(
    (itemId: string, sourceTierId: string, targetTierId: string) => {
      setState((prev) => {
        const newAssignments = converter.moveBetweenTiers(
          prev.assignments,
          itemId,
          targetTierId
        );
        return { ...prev, assignments: newAssignments };
      });
    },
    [converter]
  );

  // Remove item from tier
  const removeItemFromTier = useCallback((itemId: string, tierId: string) => {
    setState((prev) => {
      const newAssignments = prev.assignments.map((assignment) => {
        if (assignment.tierId === tierId) {
          const items = assignment.items.filter((i) => i.itemId !== itemId);
          // Re-index
          items.forEach((item, idx) => {
            item.orderInTier = idx;
          });
          return { ...assignment, items };
        }
        return assignment;
      });

      return { ...prev, assignments: newAssignments };
    });
  }, []);

  // Promote item (move to higher tier)
  const promoteItem = useCallback((itemId: string, currentTierId: string) => {
    setState((prev) => {
      const currentIndex = prev.assignments.findIndex((a) => a.tierId === currentTierId);
      if (currentIndex <= 0) return prev;

      const targetTierId = prev.assignments[currentIndex - 1].tierId;
      const newAssignments = converter.moveBetweenTiers(
        prev.assignments,
        itemId,
        targetTierId
      );
      return { ...prev, assignments: newAssignments };
    });
  }, [converter]);

  // Demote item (move to lower tier)
  const demoteItem = useCallback((itemId: string, currentTierId: string) => {
    setState((prev) => {
      const currentIndex = prev.assignments.findIndex((a) => a.tierId === currentTierId);
      if (currentIndex >= prev.assignments.length - 1) return prev;

      const targetTierId = prev.assignments[currentIndex + 1].tierId;
      const newAssignments = converter.moveBetweenTiers(
        prev.assignments,
        itemId,
        targetTierId
      );
      return { ...prev, assignments: newAssignments };
    });
  }, [converter]);

  // Change tier count
  const changeTierCount = useCallback((newCount: number) => {
    setState((prev) => {
      const boundaries = calculateTierBoundaries(listSize, newCount, 'pyramid');
      const newTiers = createTiersFromBoundaries(boundaries, preset);

      // Redistribute existing items to new tiers
      const allItems = prev.assignments.flatMap((a) => a.items);
      const itemsPerTier = Math.ceil(allItems.length / newCount);

      const newAssignments: TierAssignment[] = newTiers.map((tier, index) => ({
        tierId: tier.id,
        tierLabel: tier.label,
        tierIndex: index,
        items: [],
        capacity: enableCapacityLimits ? tier.endPosition - tier.startPosition : undefined,
      }));

      // Distribute items
      allItems.forEach((item, i) => {
        const tierIndex = Math.min(Math.floor(i / itemsPerTier), newCount - 1);
        const assignment = newAssignments[tierIndex];
        assignment.items.push({
          ...item,
          tierId: assignment.tierId,
          orderInTier: assignment.items.length,
        });
      });

      return {
        ...prev,
        tiers: newTiers,
        tierCount: newCount,
        assignments: newAssignments,
      };
    });
  }, [listSize, preset, enableCapacityLimits]);

  // Convert to positions and notify parent
  const handleConvertToPositions = useCallback(() => {
    const result = convertTiersToPositions(state.assignments, state.tiers, listSize, conversionStrategy);
    onConvertToPositions?.(result.positions);
  }, [state.assignments, state.tiers, listSize, conversionStrategy, onConvertToPositions]);

  // Reset all assignments
  const handleReset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      assignments: prev.tiers.map((tier, index) => ({
        tierId: tier.id,
        tierLabel: tier.label,
        tierIndex: index,
        items: [],
        capacity: enableCapacityLimits ? tier.endPosition - tier.startPosition : undefined,
      })),
    }));
  }, [enableCapacityLimits]);

  // Toggle mode
  const toggleMode = useCallback(() => {
    const newMode = state.mode === 'tier' ? 'position' : 'tier';
    setState((prev) => ({ ...prev, mode: newMode }));
    onModeChange?.(newMode);
  }, [state.mode, onModeChange]);

  // Notify parent of assignment changes
  useEffect(() => {
    onAssignmentsChange?.(state.assignments);
  }, [state.assignments, onAssignmentsChange]);

  // Get item data from assignments
  const getItemData = useCallback(
    (itemId: string): RankableItem | undefined => {
      return availableItems.find((i) => i.id === itemId);
    },
    [availableItems]
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAssigned = state.assignments.reduce((sum, a) => sum + a.items.length, 0);
    return {
      totalAssigned,
      totalUnassigned: availableItems.length - totalAssigned,
      isComplete: totalAssigned === availableItems.length,
    };
  }, [state.assignments, availableItems.length]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Tier Ranking</h2>
          <span className="text-sm text-muted-foreground">
            {stats.totalAssigned}/{availableItems.length} items ranked
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <button
            onClick={toggleMode}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm',
              'border hover:bg-muted transition-colors'
            )}
          >
            {state.mode === 'tier' ? (
              <>
                <LayoutGrid className="w-4 h-4" />
                <span>Tier Mode</span>
              </>
            ) : (
              <>
                <List className="w-4 h-4" />
                <span>Position Mode</span>
              </>
            )}
          </button>

          {/* Tier count controls */}
          {enableTierCustomization && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border">
              <button
                onClick={() => changeTierCount(Math.max(3, state.tierCount - 1))}
                disabled={state.tierCount <= 3}
                className="p-1 hover:bg-muted rounded disabled:opacity-30"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm px-2">{state.tierCount} tiers</span>
              <button
                onClick={() => changeTierCount(Math.min(9, state.tierCount + 1))}
                disabled={state.tierCount >= 9}
                className="p-1 hover:bg-muted rounded disabled:opacity-30"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="p-2 rounded-lg border hover:bg-muted transition-colors"
            title="Reset all tiers"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Convert to positions */}
          <button
            onClick={handleConvertToPositions}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'transition-colors'
            )}
          >
            <Download className="w-4 h-4" />
            <span>Convert to Positions</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <DndContext
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-3">
          {/* Tier rows */}
          <AnimatePresence mode="popLayout">
            {state.tiers.map((tier, index) => {
              const assignment = state.assignments.find((a) => a.tierId === tier.id);
              const items = assignment?.items.map((i) => ({
                ...i,
                ...(getItemData(i.itemId) || { id: i.itemId, title: 'Unknown' }),
              })) || [];

              return (
                <motion.div
                  key={tier.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TierRow
                    tier={tier}
                    tierIndex={index}
                    items={items}
                    capacity={assignment?.capacity}
                    isDragging={state.isDragging}
                    isOver={state.hoveredTierId === tier.id}
                    onRemoveItem={(itemId) => removeItemFromTier(itemId, tier.id)}
                    onPromote={(itemId) => promoteItem(itemId, tier.id)}
                    onDemote={(itemId) => demoteItem(itemId, tier.id)}
                    canPromote={index > 0}
                    canDemote={index < state.tiers.length - 1}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </DndContext>

      {/* Unassigned items indicator */}
      {unassignedItems.length > 0 && (
        <div className="mt-4 p-4 rounded-xl border border-dashed border-muted-foreground/30">
          <p className="text-sm text-muted-foreground text-center">
            {unassignedItems.length} items remaining in backlog.
            Drag them into tiers above.
          </p>
        </div>
      )}

      {/* Completion message */}
      {stats.isComplete && (
        <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <p className="text-sm text-green-600 text-center font-medium">
            All items ranked! Click "Convert to Positions" to finalize.
          </p>
        </div>
      )}
    </div>
  );
}

export default TierRankingMode;
