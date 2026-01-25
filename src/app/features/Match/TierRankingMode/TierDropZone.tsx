'use client';

/**
 * TierDropZone
 * A specialized drop zone for tier-based ranking with visual feedback
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TierDefinition } from '@/lib/tiers/types';
import {
  createTierRowDropData,
  TierRowDropData,
} from '@/lib/tiers/TierRow';

interface TierDropZoneProps {
  /** Tier definition */
  tier: TierDefinition;
  /** Index in tier list (0 = top tier) */
  tierIndex: number;
  /** Number of items currently in this tier */
  itemCount: number;
  /** Optional capacity limit */
  capacity?: number;
  /** Whether the whole tier ranking mode is in drag state */
  isDragging?: boolean;
  /** Whether this specific zone is being hovered */
  isHovered?: boolean;
  /** Children to render inside the drop zone */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Minimum height when empty */
  minHeight?: number;
  /** Show capacity indicator */
  showCapacity?: boolean;
  /** Custom drop data */
  customDropData?: Partial<TierRowDropData>;
}

/**
 * Visual feedback indicators for drop zones
 */
function DropIndicator({
  tier,
  isOver,
  atCapacity,
}: {
  tier: TierDefinition;
  isOver: boolean;
  atCapacity: boolean;
}) {
  if (!isOver) return null;

  return (
    <motion.div
      className={cn(
        'absolute inset-0 rounded-xl pointer-events-none z-10',
        atCapacity
          ? 'border-2 border-red-500 bg-red-500/5'
          : 'border-2 border-primary bg-primary/5'
      )}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {/* Animated border pulse */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-xl',
          atCapacity ? 'border-2 border-red-500' : 'border-2 border-primary'
        )}
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Status message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium',
            atCapacity
              ? 'bg-red-500/20 text-red-500'
              : 'bg-primary/20 text-primary'
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {atCapacity ? 'Tier is full' : `Drop to add to ${tier.label}`}
        </motion.span>
      </div>
    </motion.div>
  );
}

/**
 * Capacity badge
 */
function CapacityBadge({
  current,
  max,
  tier,
}: {
  current: number;
  max: number;
  tier: TierDefinition;
}) {
  const percentage = (current / max) * 100;
  const isFull = current >= max;
  const isAlmostFull = percentage >= 80;

  return (
    <div
      className={cn(
        'absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-medium',
        isFull && 'bg-red-500/20 text-red-500',
        isAlmostFull && !isFull && 'bg-amber-500/20 text-amber-500',
        !isAlmostFull && 'bg-background/50 text-muted-foreground'
      )}
    >
      <span>
        {current}/{max}
      </span>
      {isFull && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-block"
        >
          (Full)
        </motion.span>
      )}
    </div>
  );
}

/**
 * Drag guidance overlay shown when drag mode is active
 */
function DragGuidance({
  tier,
  tierIndex,
  itemCount,
}: {
  tier: TierDefinition;
  tierIndex: number;
  itemCount: number;
}) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {itemCount === 0 && (
        <div className="flex flex-col items-center gap-1 opacity-40">
          <motion.div
            className="w-8 h-8 rounded-full border-2 border-dashed border-current"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <span className="text-xs">Drop here</span>
        </div>
      )}
    </motion.div>
  );
}

/**
 * TierDropZone component
 */
export const TierDropZone = forwardRef<HTMLDivElement, TierDropZoneProps>(
  function TierDropZone(
    {
      tier,
      tierIndex,
      itemCount,
      capacity,
      isDragging = false,
      isHovered = false,
      children,
      className,
      minHeight = 80,
      showCapacity = true,
      customDropData,
    },
    externalRef
  ) {
    // Check capacity
    const atCapacity = capacity !== undefined && itemCount >= capacity;

    // Set up droppable
    const { isOver, setNodeRef, active } = useDroppable({
      id: `tier-dropzone-${tier.id}`,
      disabled: atCapacity,
      data: {
        ...createTierRowDropData(tier.id, tierIndex),
        ...customDropData,
      },
    });

    // Combine refs
    const combinedRef = useCallback(
      (node: HTMLDivElement | null) => {
        setNodeRef(node);
        if (typeof externalRef === 'function') {
          externalRef(node);
        } else if (externalRef) {
          externalRef.current = node;
        }
      },
      [setNodeRef, externalRef]
    );

    // Determine visual state
    const showDropIndicator = isOver || isHovered;
    const showGuidance = isDragging && !showDropIndicator && itemCount === 0;

    return (
      <motion.div
        ref={combinedRef}
        className={cn(
          'relative rounded-xl border transition-all duration-200',
          isDragging && !atCapacity && 'border-primary/30',
          isDragging && atCapacity && 'border-red-500/30 opacity-50',
          !isDragging && 'border-border/50',
          className
        )}
        style={{
          minHeight,
          background: tier.color.gradient,
        }}
        animate={{
          scale: showDropIndicator && !atCapacity ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Capacity badge */}
        {showCapacity && capacity !== undefined && (
          <CapacityBadge current={itemCount} max={capacity} tier={tier} />
        )}

        {/* Children (items) */}
        {children}

        {/* Drag guidance */}
        {showGuidance && (
          <DragGuidance tier={tier} tierIndex={tierIndex} itemCount={itemCount} />
        )}

        {/* Drop indicator */}
        <DropIndicator tier={tier} isOver={showDropIndicator} atCapacity={atCapacity} />
      </motion.div>
    );
  }
);

/**
 * Mini tier drop zone (for compact views)
 */
export function MiniTierDropZone({
  tier,
  tierIndex,
  itemCount,
  capacity,
  onDrop,
  className,
}: {
  tier: TierDefinition;
  tierIndex: number;
  itemCount: number;
  capacity?: number;
  onDrop?: (tierId: string) => void;
  className?: string;
}) {
  const atCapacity = capacity !== undefined && itemCount >= capacity;

  const { isOver, setNodeRef } = useDroppable({
    id: `mini-tier-${tier.id}`,
    disabled: atCapacity,
    data: createTierRowDropData(tier.id, tierIndex),
  });

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(
        'flex items-center justify-center px-3 py-2 rounded-lg',
        'border transition-all cursor-pointer',
        isOver && !atCapacity && 'border-primary ring-2 ring-primary/20 scale-105',
        isOver && atCapacity && 'border-red-500 opacity-50',
        !isOver && 'border-border/50 hover:border-border',
        className
      )}
      style={{ background: tier.color.gradient }}
      onClick={() => onDrop?.(tier.id)}
      whileHover={{ scale: atCapacity ? 1 : 1.02 }}
      whileTap={{ scale: atCapacity ? 1 : 0.98 }}
    >
      <span className="font-bold text-sm" style={{ color: tier.color.text }}>
        {tier.label}
      </span>
      <span className="ml-1 text-xs opacity-60" style={{ color: tier.color.text }}>
        ({itemCount}{capacity !== undefined ? `/${capacity}` : ''})
      </span>
    </motion.div>
  );
}

/**
 * Tier quick-select bar for fast assignment
 */
export function TierQuickSelect({
  tiers,
  itemCounts,
  capacities,
  onSelect,
  selectedTierId,
  className,
}: {
  tiers: TierDefinition[];
  itemCounts: Map<string, number>;
  capacities?: Map<string, number>;
  onSelect: (tierId: string) => void;
  selectedTierId?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tiers.map((tier, index) => {
        const count = itemCounts.get(tier.id) || 0;
        const capacity = capacities?.get(tier.id);
        const isSelected = selectedTierId === tier.id;
        const atCapacity = capacity !== undefined && count >= capacity;

        return (
          <button
            key={tier.id}
            onClick={() => onSelect(tier.id)}
            disabled={atCapacity}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg',
              'border transition-all',
              isSelected && 'ring-2 ring-primary',
              atCapacity && 'opacity-50 cursor-not-allowed',
              !atCapacity && 'hover:scale-105'
            )}
            style={{ background: tier.color.gradient }}
          >
            <span className="font-bold text-sm" style={{ color: tier.color.text }}>
              {tier.label}
            </span>
            <span className="text-xs opacity-60" style={{ color: tier.color.text }}>
              {count}{capacity !== undefined ? `/${capacity}` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default TierDropZone;
