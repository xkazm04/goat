'use client';

/**
 * TierAutoArranger
 * Automatically arranges items within tiers based on various strategies
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TierItem, TierAssignment } from '@/lib/tiers/TierConverter';
import { TierDefinition } from '@/lib/tiers/types';
import {
  ArrowUpDown,
  Shuffle,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  LayoutGrid,
  List,
  Check,
} from 'lucide-react';

/**
 * Arrangement strategy
 */
export type ArrangementStrategy =
  | 'manual'          // User manually reorders
  | 'alphabetical'    // Sort by title A-Z
  | 'reverse-alpha'   // Sort by title Z-A
  | 'recent-first'    // Most recently added first
  | 'recent-last'     // Most recently added last
  | 'random'          // Random shuffle
  | 'compact';        // Remove gaps, pack items

interface ArrangeableItem extends TierItem {
  title: string;
  image_url?: string | null;
  addedAt?: number;  // Timestamp when added to tier
}

interface TierAutoArrangerProps {
  /** Tier definition */
  tier: TierDefinition;
  /** Items in the tier */
  items: ArrangeableItem[];
  /** Called when items are rearranged */
  onReorder: (items: ArrangeableItem[]) => void;
  /** Current arrangement strategy */
  strategy?: ArrangementStrategy;
  /** Called when strategy changes */
  onStrategyChange?: (strategy: ArrangementStrategy) => void;
  /** Show strategy selector */
  showStrategySelector?: boolean;
  /** Enable drag reorder */
  enableDragReorder?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Strategy option definition
 */
interface StrategyOption {
  id: ArrangementStrategy;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    id: 'manual',
    label: 'Manual',
    icon: <LayoutGrid className="w-4 h-4" />,
    description: 'Drag to reorder manually',
  },
  {
    id: 'alphabetical',
    label: 'A → Z',
    icon: <ArrowDown className="w-4 h-4" />,
    description: 'Sort alphabetically',
  },
  {
    id: 'reverse-alpha',
    label: 'Z → A',
    icon: <ArrowUp className="w-4 h-4" />,
    description: 'Sort reverse alphabetically',
  },
  {
    id: 'recent-first',
    label: 'Newest',
    icon: <ChevronsUpDown className="w-4 h-4" />,
    description: 'Recently added first',
  },
  {
    id: 'random',
    label: 'Shuffle',
    icon: <Shuffle className="w-4 h-4" />,
    description: 'Randomize order',
  },
];

/**
 * Apply arrangement strategy to items
 */
export function applyArrangementStrategy(
  items: ArrangeableItem[],
  strategy: ArrangementStrategy
): ArrangeableItem[] {
  const sortedItems = [...items];

  switch (strategy) {
    case 'alphabetical':
      sortedItems.sort((a, b) => a.title.localeCompare(b.title));
      break;

    case 'reverse-alpha':
      sortedItems.sort((a, b) => b.title.localeCompare(a.title));
      break;

    case 'recent-first':
      sortedItems.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      break;

    case 'recent-last':
      sortedItems.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
      break;

    case 'random':
      // Fisher-Yates shuffle
      for (let i = sortedItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sortedItems[i], sortedItems[j]] = [sortedItems[j], sortedItems[i]];
      }
      break;

    case 'compact':
    case 'manual':
    default:
      // Keep current order, just update orderInTier
      break;
  }

  // Update orderInTier for all items
  return sortedItems.map((item, index) => ({
    ...item,
    orderInTier: index,
  }));
}

/**
 * Strategy selector dropdown
 */
function StrategySelector({
  currentStrategy,
  onSelect,
  className,
}: {
  currentStrategy: ArrangementStrategy;
  onSelect: (strategy: ArrangementStrategy) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const current = STRATEGY_OPTIONS.find((s) => s.id === currentStrategy);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
          'border bg-background hover:bg-muted transition-colors'
        )}
      >
        {current?.icon}
        <span>{current?.label || 'Sort'}</span>
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'absolute top-full left-0 mt-1 z-50',
                'min-w-[180px] p-1 rounded-lg border bg-popover shadow-lg'
              )}
            >
              {STRATEGY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onSelect(option.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                    'hover:bg-muted transition-colors',
                    currentStrategy === option.id && 'bg-primary/10 text-primary'
                  )}
                >
                  {option.icon}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                  {currentStrategy === option.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Draggable item within the arranger
 */
function ArrangerItem({
  item,
  index,
  isDragging,
}: {
  item: ArrangeableItem;
  index: number;
  isDragging?: boolean;
}) {
  return (
    <Reorder.Item
      value={item}
      id={item.itemId}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg',
        'bg-background/80 border border-border/50',
        'cursor-grab active:cursor-grabbing',
        'hover:border-primary/30 transition-colors',
        isDragging && 'opacity-50'
      )}
    >
      {/* Order number */}
      <span className="w-6 text-center text-xs text-muted-foreground">
        {index + 1}
      </span>

      {/* Item image */}
      {item.image_url && (
        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-muted">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Item title */}
      <span className="flex-1 text-sm truncate">{item.title}</span>
    </Reorder.Item>
  );
}

/**
 * TierAutoArranger component
 */
export function TierAutoArranger({
  tier,
  items,
  onReorder,
  strategy = 'manual',
  onStrategyChange,
  showStrategySelector = true,
  enableDragReorder = true,
  className,
}: TierAutoArrangerProps) {
  const [localItems, setLocalItems] = useState(items);

  // Sync with external items
  useMemo(() => {
    if (JSON.stringify(items) !== JSON.stringify(localItems)) {
      setLocalItems(items);
    }
  }, [items]);

  // Handle strategy change
  const handleStrategyChange = useCallback(
    (newStrategy: ArrangementStrategy) => {
      onStrategyChange?.(newStrategy);

      if (newStrategy !== 'manual') {
        const arranged = applyArrangementStrategy(localItems, newStrategy);
        setLocalItems(arranged);
        onReorder(arranged);
      }
    },
    [localItems, onReorder, onStrategyChange]
  );

  // Handle drag reorder
  const handleReorder = useCallback(
    (newOrder: ArrangeableItem[]) => {
      // Update orderInTier
      const updated = newOrder.map((item, index) => ({
        ...item,
        orderInTier: index,
      }));
      setLocalItems(updated);
      onReorder(updated);
    },
    [onReorder]
  );

  // Quick action buttons
  const handleQuickShuffle = useCallback(() => {
    const shuffled = applyArrangementStrategy(localItems, 'random');
    setLocalItems(shuffled);
    onReorder(shuffled);
  }, [localItems, onReorder]);

  const handleQuickSort = useCallback(() => {
    const sorted = applyArrangementStrategy(localItems, 'alphabetical');
    setLocalItems(sorted);
    onReorder(sorted);
  }, [localItems, onReorder]);

  if (items.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        No items to arrange
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: tier.color.primary }}
          />
          <span className="font-medium text-sm">{tier.label}</span>
          <span className="text-xs text-muted-foreground">
            ({items.length} items)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick actions */}
          <button
            onClick={handleQuickShuffle}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={handleQuickSort}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Sort A-Z"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          {/* Strategy selector */}
          {showStrategySelector && (
            <StrategySelector
              currentStrategy={strategy}
              onSelect={handleStrategyChange}
            />
          )}
        </div>
      </div>

      {/* Items list */}
      {enableDragReorder && strategy === 'manual' ? (
        <Reorder.Group
          axis="y"
          values={localItems}
          onReorder={handleReorder}
          className="space-y-1"
        >
          {localItems.map((item, index) => (
            <ArrangerItem key={item.itemId} item={item} index={index} />
          ))}
        </Reorder.Group>
      ) : (
        <div className="space-y-1">
          {localItems.map((item, index) => (
            <div
              key={item.itemId}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg',
                'bg-background/80 border border-border/50'
              )}
            >
              <span className="w-6 text-center text-xs text-muted-foreground">
                {index + 1}
              </span>
              {item.image_url && (
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-muted">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <span className="flex-1 text-sm truncate">{item.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Bulk arranger for all tiers
 */
export function BulkTierArranger({
  tiers,
  assignments,
  itemsMap,
  onReorder,
  className,
}: {
  tiers: TierDefinition[];
  assignments: TierAssignment[];
  itemsMap: Map<string, { title: string; image_url?: string | null }>;
  onReorder: (tierId: string, items: ArrangeableItem[]) => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {tiers.map((tier) => {
        const assignment = assignments.find((a) => a.tierId === tier.id);
        const items: ArrangeableItem[] =
          assignment?.items.map((i) => ({
            ...i,
            title: itemsMap.get(i.itemId)?.title || 'Unknown',
            image_url: itemsMap.get(i.itemId)?.image_url,
          })) || [];

        if (items.length === 0) return null;

        return (
          <TierAutoArranger
            key={tier.id}
            tier={tier}
            items={items}
            onReorder={(newItems) => onReorder(tier.id, newItems)}
          />
        );
      })}
    </div>
  );
}

export default TierAutoArranger;
