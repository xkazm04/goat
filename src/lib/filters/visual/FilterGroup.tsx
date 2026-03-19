'use client';

/**
 * FilterGroup
 * AND/OR grouping container for nested filter conditions
 */

import React, { useCallback, useMemo } from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { GoatGrip, GoatFolderGroup } from '@/components/visual/GoatIcons';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { FilterCombinator } from '@/lib/filters/types';
import { COMBINATOR_LABELS, FILTER_TIMING, FILTER_SCALE } from '@/lib/filters/constants';
import { cn } from '@/lib/utils';
import { useFilterBuilderStore, type FilterTreeNode } from '@/stores/filter-builder-store';
import { FilterBlock, FilterBlockOverlay } from './FilterBlock';
import { GoatBlocks } from '@/components/illustrations/EmptyStateIllustrations';

interface FilterGroupProps {
  nodeId: string;
  node: FilterTreeNode;
  depth?: number;
  isRoot?: boolean;
}

/**
 * CombinatorToggle - Switch between AND/OR
 */
function CombinatorToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: FilterCombinator;
  onChange: (combinator: FilterCombinator) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-control border border-border bg-muted/50 p-0.5">
      <button
        onClick={() => onChange('AND')}
        disabled={disabled}
        className={cn(
          'rounded px-2 py-0.5 text-xs font-medium transition-all',
          value === 'AND'
            ? 'bg-primary/20 text-primary shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
          disabled && 'filter-disabled'
        )}
      >
        AND
      </button>
      <button
        onClick={() => onChange('OR')}
        disabled={disabled}
        className={cn(
          'rounded px-2 py-0.5 text-xs font-medium transition-all',
          value === 'OR'
            ? 'bg-orange-500/20 text-orange-400 shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
          disabled && 'filter-disabled'
        )}
      >
        OR
      </button>
    </div>
  );
}

/**
 * DropZoneIndicator - Shows insertion line between items during drag
 */
function DropZoneIndicator({ parentId, index }: { parentId: string; index: number }) {
  const { active } = useDndContext();
  const { isOver, setNodeRef } = useDroppable({
    id: `zone-${parentId}-${index}`,
    data: {
      type: 'zone',
      parentId,
      index,
    },
  });

  // Only show when a drag is active
  if (!active) return <div ref={setNodeRef} className="h-0" />;

  return (
    <div ref={setNodeRef} className="relative py-1">
      <motion.div
        animate={{
          height: isOver ? 4 : 2,
          opacity: isOver ? 1 : 0.3,
          scale: isOver ? FILTER_SCALE.hover : 1,
        }}
        transition={{ duration: FILTER_TIMING.fast }}
        className={cn(
          'rounded-full mx-6 transition-colors',
          isOver
            ? 'bg-primary shadow-[0_0_8px_rgba(var(--brand-rgb,99,102,241),0.4)]'
            : 'bg-border/50'
        )}
      />
      {isOver && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          className="absolute inset-x-4 -top-1 -bottom-1 rounded-md border-2 border-dashed border-primary/30 bg-primary/5 pointer-events-none"
        />
      )}
    </div>
  );
}

/**
 * FilterGroup component
 */
export function FilterGroup({
  nodeId,
  node,
  depth = 0,
  isRoot = false,
}: FilterGroupProps) {
  const {
    nodes,
    expandedGroups,
    addCondition,
    addGroup,
    removeNode,
    toggleNodeEnabled,
    toggleGroupExpanded,
    updateGroupCombinator,
  } = useFilterBuilderStore();

  const isExpanded = expandedGroups.has(nodeId);
  const combinator = node.group?.combinator || 'AND';
  const isEnabled = node.group?.enabled ?? true;
  const children = node.children || [];

  // Draggable setup (only for non-root groups)
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: nodeId,
    disabled: isRoot,
    data: {
      type: 'group',
      nodeId,
      combinator,
    },
  });

  // Droppable setup
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `drop-${nodeId}`,
    data: {
      type: 'zone',
      parentId: nodeId,
      index: children.length,
    },
  });

  // Combine refs
  const setNodeRef = useCallback(
    (element: HTMLElement | null) => {
      setDragRef(element);
      setDropRef(element);
    },
    [setDragRef, setDropRef]
  );

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  // Handlers
  const handleToggleExpand = useCallback(() => {
    toggleGroupExpanded(nodeId);
  }, [nodeId, toggleGroupExpanded]);

  const handleToggleEnabled = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleNodeEnabled(nodeId);
    },
    [nodeId, toggleNodeEnabled]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeNode(nodeId);
    },
    [nodeId, removeNode]
  );

  const handleAddCondition = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      addCondition(nodeId);
      if (!isExpanded) {
        toggleGroupExpanded(nodeId);
      }
    },
    [nodeId, addCondition, isExpanded, toggleGroupExpanded]
  );

  const handleAddGroup = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      addGroup(nodeId);
      if (!isExpanded) {
        toggleGroupExpanded(nodeId);
      }
    },
    [nodeId, addGroup, isExpanded, toggleGroupExpanded]
  );

  const handleCombinatorChange = useCallback(
    (newCombinator: FilterCombinator) => {
      updateGroupCombinator(nodeId, newCombinator);
    },
    [nodeId, updateGroupCombinator]
  );

  // Render child nodes
  const childNodes = useMemo(() => {
    return children
      .map((childId) => nodes[childId])
      .filter((n): n is FilterTreeNode => !!n);
  }, [children, nodes]);

  const conditionCount = useMemo(() => {
    return childNodes.filter((n) => n.type === 'condition').length;
  }, [childNodes]);

  const groupCount = useMemo(() => {
    return childNodes.filter((n) => n.type === 'group').length;
  }, [childNodes]);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layoutId={isRoot ? undefined : nodeId}
      initial={isRoot ? false : { opacity: 0, y: -10 }}
      animate={{
        opacity: isEnabled ? (isDragging ? 0.4 : 1) : 0.5,
        y: 0,
        scale: isOver ? FILTER_SCALE.hover : 1,
      }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: FILTER_TIMING.standard, layout: { type: 'spring', stiffness: 350, damping: 30 } }}
      className={cn(
        'rounded-card border transition-shadow',
        isRoot ? 'border-transparent' : 'border-border/50 bg-background/30',
        isOver && 'ring-2 ring-primary/50 shadow-lg shadow-primary/10',
        isDragging && 'shadow-xl shadow-primary/20',
        !isEnabled && 'opacity-60'
      )}
    >
      {/* Group header */}
      <div
        className={cn(
          'flex items-center gap-2 p-2',
          !isRoot && 'cursor-pointer',
          !isRoot && 'filter-hover'
        )}
        onClick={!isRoot ? handleToggleExpand : undefined}
      >
        {/* Drag handle (non-root only) */}
        {!isRoot && (
          <div
            {...attributes}
            {...listeners}
            className={cn(
              'cursor-grab rounded p-1 text-muted-foreground hover:text-foreground',
              'active:cursor-grabbing'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <GoatGrip size={16} />
          </div>
        )}

        {/* Expand/collapse */}
        <button
          onClick={handleToggleExpand}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Combinator toggle */}
        <CombinatorToggle
          value={combinator}
          onChange={handleCombinatorChange}
          disabled={!isEnabled}
        />

        {/* Group label / counts */}
        <span className="flex-1 text-xs text-muted-foreground">
          {!isRoot && (
            <>
              Group
              {children.length > 0 && (
                <span className="ml-2 text-muted-foreground">
                  ({conditionCount} condition{conditionCount !== 1 ? 's' : ''}
                  {groupCount > 0 && `, ${groupCount} group${groupCount !== 1 ? 's' : ''}`})
                </span>
              )}
            </>
          )}
          {isRoot && children.length === 0 && (
            <span className="text-muted-foreground italic">
              Add conditions or groups to start filtering
            </span>
          )}
        </span>

        {/* Add buttons */}
        <button
          onClick={handleAddCondition}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-xs',
            'bg-primary/10 text-primary',
            'hover:bg-primary/20 transition-colors'
          )}
          title="Add condition"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Condition</span>
        </button>

        <button
          onClick={handleAddGroup}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-xs',
            'bg-orange-500/10 text-orange-400',
            'hover:bg-orange-500/20 transition-colors'
          )}
          title="Add nested group"
        >
          <GoatFolderGroup size={14} />
          <span className="hidden sm:inline">Group</span>
        </button>

        {/* Toggle enabled (non-root only) */}
        {!isRoot && (
          <button
            onClick={handleToggleEnabled}
            className={cn(
              'rounded p-1 transition-colors',
              isEnabled
                ? 'text-emerald-500 hover:text-emerald-400'
                : 'text-muted-foreground hover:text-muted-foreground'
            )}
            title={isEnabled ? 'Disable group' : 'Enable group'}
          >
            {isEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
        )}

        {/* Remove button (non-root only) */}
        {!isRoot && (
          <button
            onClick={handleRemove}
            className={cn(
              'rounded p-1 text-muted-foreground transition-colors',
              'hover:bg-red-500/20 hover:text-red-400'
            )}
            title="Remove group"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: FILTER_TIMING.standard }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'flex flex-col gap-2',
                isRoot ? 'p-0' : 'p-3 pt-1',
                depth > 0 && 'border-l-2 border-border/30 ml-4'
              )}
            >
              {/* Top drop zone */}
              <DropZoneIndicator parentId={nodeId} index={0} />

              {childNodes.map((childNode, index) => (
                <React.Fragment key={childNode.id}>
                  {/* Combinator separator (between items) */}
                  {index > 0 && (
                    <div className="flex items-center gap-2 pl-6">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          combinator === 'AND' ? 'text-primary/60' : 'text-orange-500/60'
                        )}
                      >
                        {combinator}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  {/* Render child */}
                  {childNode.type === 'condition' && childNode.condition && (
                    <FilterBlock
                      nodeId={childNode.id}
                      condition={childNode.condition}
                      depth={depth + 1}
                    />
                  )}
                  {childNode.type === 'group' && (
                    <FilterGroup
                      nodeId={childNode.id}
                      node={childNode}
                      depth={depth + 1}
                    />
                  )}

                  {/* Drop zone between/after items */}
                  <DropZoneIndicator parentId={nodeId} index={index + 1} />
                </React.Fragment>
              ))}

              {/* Empty state */}
              {children.length === 0 && !isOver && (
                <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-gradient-to-br from-primary/[0.04] to-purple-500/[0.04] p-4">
                  <GoatBlocks width={80} height={64} />
                  <span className="text-xs text-muted-foreground mt-1">
                    {isRoot
                      ? 'Click "Condition" or "Group" to add filters'
                      : 'This group is empty. Add conditions or nested groups.'}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * FilterGroupOverlay - Used during drag operations
 */
export function FilterGroupOverlay({ combinator, childCount }: { combinator: FilterCombinator; childCount: number }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-card border border-border p-3',
        'bg-background/90 backdrop-blur-xs shadow-lg shadow-primary/30',
        'ring-2 ring-primary'
      )}
    >
      <GoatGrip size={16} className="text-primary" />
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-xs font-medium',
          combinator === 'AND'
            ? 'bg-primary/20 text-primary'
            : 'bg-orange-500/20 text-orange-400'
        )}
      >
        {combinator}
      </span>
      <span className="text-sm text-muted-foreground">
        Group ({childCount} item{childCount !== 1 ? 's' : ''})
      </span>
    </div>
  );
}

/**
 * Root combinator toggle for the filter builder
 */
export function RootCombinatorToggle() {
  const { rootCombinator, setRootCombinator } = useFilterBuilderStore();

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground">Match</span>
      <CombinatorToggle value={rootCombinator} onChange={setRootCombinator} />
      <span className="text-xs text-muted-foreground">
        {COMBINATOR_LABELS[rootCombinator].description}
      </span>
    </div>
  );
}
