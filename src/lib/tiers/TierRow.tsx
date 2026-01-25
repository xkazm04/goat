'use client';

/**
 * TierRow
 * A droppable tier container for tier-based ranking mode
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TierDefinition } from './types';
import { TierItem, TierAssignment } from './TierConverter';
import { ChevronUp, ChevronDown, X, GripVertical } from 'lucide-react';

/**
 * Drop data for tier rows
 */
export interface TierRowDropData {
  type: 'tier-row';
  tierId: string;
  tierIndex: number;
  acceptsFromBacklog: boolean;
  acceptsFromGrid: boolean;
  acceptsFromTier: boolean;
}

/**
 * Drag data for items within tiers
 */
export interface TierItemDragData {
  type: 'tier-item';
  itemId: string;
  tierId: string;
  orderInTier: number;
  item: {
    id: string;
    title: string;
    image_url?: string | null;
  };
}

/**
 * Create tier row drop data
 */
export function createTierRowDropData(
  tierId: string,
  tierIndex: number,
  options: Partial<Pick<TierRowDropData, 'acceptsFromBacklog' | 'acceptsFromGrid' | 'acceptsFromTier'>> = {}
): TierRowDropData {
  return {
    type: 'tier-row',
    tierId,
    tierIndex,
    acceptsFromBacklog: options.acceptsFromBacklog ?? true,
    acceptsFromGrid: options.acceptsFromGrid ?? true,
    acceptsFromTier: options.acceptsFromTier ?? true,
  };
}

/**
 * Create tier item drag data
 */
export function createTierItemDragData(
  item: { id: string; title: string; image_url?: string | null },
  tierId: string,
  orderInTier: number
): TierItemDragData {
  return {
    type: 'tier-item',
    itemId: item.id,
    tierId,
    orderInTier,
    item,
  };
}

/**
 * Type guard for tier row drop data
 */
export function isTierRowDropData(data: unknown): data is TierRowDropData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as TierRowDropData).type === 'tier-row'
  );
}

/**
 * Type guard for tier item drag data
 */
export function isTierItemDragData(data: unknown): data is TierItemDragData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as TierItemDragData).type === 'tier-item'
  );
}

interface TierRowProps {
  /** Tier definition */
  tier: TierDefinition;
  /** Index in tier list (0 = top) */
  tierIndex: number;
  /** Items in this tier */
  items: Array<{
    id: string;
    title: string;
    image_url?: string | null;
    orderInTier: number;
  }>;
  /** Optional capacity limit */
  capacity?: number;
  /** Is this row being dragged over */
  isOver?: boolean;
  /** Is the system in drag mode */
  isDragging?: boolean;
  /** Called when item is removed from tier */
  onRemoveItem?: (itemId: string) => void;
  /** Called when item order changes within tier */
  onReorderItem?: (itemId: string, newOrder: number) => void;
  /** Called when promote button is clicked */
  onPromote?: (itemId: string) => void;
  /** Called when demote button is clicked */
  onDemote?: (itemId: string) => void;
  /** Can items be promoted from this tier */
  canPromote?: boolean;
  /** Can items be demoted from this tier */
  canDemote?: boolean;
  /** Show actions on hover */
  showActions?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Individual draggable item within a tier
 */
function TierRowItem({
  item,
  tierId,
  orderInTier,
  onRemove,
  onPromote,
  onDemote,
  canPromote,
  canDemote,
  showActions,
  disabled,
}: {
  item: { id: string; title: string; image_url?: string | null };
  tierId: string;
  orderInTier: number;
  onRemove?: () => void;
  onPromote?: () => void;
  onDemote?: () => void;
  canPromote?: boolean;
  canDemote?: boolean;
  showActions?: boolean;
  disabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    transform,
  } = useDraggable({
    id: `tier-item-${item.id}`,
    disabled,
    data: createTierItemDragData(item, tierId, orderInTier),
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 100 : undefined,
      }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-2 p-2 rounded-lg',
        'bg-background/80 border border-border/50',
        'transition-all duration-150',
        isDragging && 'opacity-50 scale-95',
        !disabled && 'hover:border-primary/30 hover:bg-background',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {/* Drag handle */}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Item image */}
      {item.image_url && (
        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-muted">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Item title */}
      <span className="flex-1 text-sm truncate">{item.title}</span>

      {/* Action buttons (visible on hover) */}
      {showActions && !disabled && (
        <div
          className={cn(
            'flex items-center gap-1 opacity-0 group-hover:opacity-100',
            'transition-opacity duration-150'
          )}
        >
          {canPromote && onPromote && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPromote();
              }}
              className="p-1 rounded hover:bg-green-500/20 text-green-500"
              title="Move to higher tier"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {canDemote && onDemote && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDemote();
              }}
              className="p-1 rounded hover:bg-amber-500/20 text-amber-500"
              title="Move to lower tier"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 rounded hover:bg-red-500/20 text-red-500"
              title="Remove from tier"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/**
 * TierRow component
 */
export function TierRow({
  tier,
  tierIndex,
  items,
  capacity,
  isOver: externalIsOver,
  isDragging: externalIsDragging,
  onRemoveItem,
  onReorderItem,
  onPromote,
  onDemote,
  canPromote = true,
  canDemote = true,
  showActions = true,
  disabled = false,
  className,
}: TierRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Set up droppable
  const { isOver, setNodeRef } = useDroppable({
    id: `tier-row-${tier.id}`,
    disabled,
    data: createTierRowDropData(tier.id, tierIndex),
  });

  // Check capacity
  const atCapacity = capacity !== undefined && items.length >= capacity;
  const remainingCapacity = capacity !== undefined ? capacity - items.length : null;

  // Determine highlight state
  const isHighlighted = isOver || externalIsOver;
  const shouldExpand = externalIsDragging && !atCapacity;

  // Sort items by orderInTier
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.orderInTier - b.orderInTier),
    [items]
  );

  return (
    <motion.div
      ref={(node) => {
        setNodeRef(node);
        if (node) (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={cn(
        'relative flex gap-4 p-3 rounded-xl border transition-all duration-200',
        isHighlighted && !atCapacity && 'border-primary ring-2 ring-primary/20',
        isHighlighted && atCapacity && 'border-red-500/50',
        !isHighlighted && 'border-border/50',
        shouldExpand && 'min-h-[100px]',
        disabled && 'opacity-50',
        className
      )}
      style={{
        background: tier.color.gradient,
      }}
      animate={{
        scale: isHighlighted ? 1.01 : 1,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Tier label */}
      <div
        className="flex flex-col items-center justify-center w-16 flex-shrink-0"
        style={{ color: tier.color.text }}
      >
        <span className="text-2xl font-bold">{tier.label}</span>
        {tier.description && (
          <span className="text-xs opacity-70 text-center">{tier.description}</span>
        )}
        {capacity !== undefined && (
          <span className="text-xs mt-1 opacity-60">
            {items.length}/{capacity}
          </span>
        )}
      </div>

      {/* Items container */}
      <div className="flex-1 flex flex-wrap gap-2 items-start content-start min-h-[60px]">
        <AnimatePresence mode="popLayout">
          {sortedItems.map((item) => (
            <TierRowItem
              key={item.id}
              item={item}
              tierId={tier.id}
              orderInTier={item.orderInTier}
              onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
              onPromote={onPromote ? () => onPromote(item.id) : undefined}
              onDemote={onDemote ? () => onDemote(item.id) : undefined}
              canPromote={canPromote && tierIndex > 0}
              canDemote={canDemote && tierIndex < 10}  // Assume max 10 tiers
              showActions={showActions}
              disabled={disabled}
            />
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[60px] text-sm opacity-50">
            {externalIsDragging ? (
              <span>Drop items here</span>
            ) : (
              <span>No items in this tier</span>
            )}
          </div>
        )}

        {/* Capacity warning */}
        {atCapacity && externalIsDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 rounded-xl">
            <span className="text-sm text-red-500 font-medium">Tier is full</span>
          </div>
        )}
      </div>

      {/* Drop indicator */}
      {isHighlighted && !atCapacity && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-dashed border-primary pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
}

/**
 * Compact tier row variant
 */
export function TierRowCompact({
  tier,
  tierIndex,
  itemCount,
  capacity,
  isOver,
  onClick,
  className,
}: {
  tier: TierDefinition;
  tierIndex: number;
  itemCount: number;
  capacity?: number;
  isOver?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        'hover:border-primary/30',
        isOver && 'border-primary ring-2 ring-primary/20',
        className
      )}
      style={{ background: tier.color.gradient }}
    >
      <span className="font-bold" style={{ color: tier.color.text }}>
        {tier.label}
      </span>
      <span className="text-xs opacity-70">
        {itemCount}
        {capacity !== undefined && `/${capacity}`}
      </span>
    </button>
  );
}

export default TierRow;
