'use client';

/**
 * FilterGroup
 * AND/OR grouping container for nested filter conditions
 */

import React, { useCallback, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  FolderPlus,
} from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { FilterCombinator } from '@/lib/filters/types';
import { COMBINATOR_LABELS } from '@/lib/filters/constants';
import { cn } from '@/lib/utils';
import { useFilterBuilderStore, type FilterTreeNode } from '@/stores/filter-builder-store';
import { FilterBlock, FilterBlockOverlay } from './FilterBlock';

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
    <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-800/50 p-0.5">
      <button
        onClick={() => onChange('AND')}
        disabled={disabled}
        className={cn(
          'rounded px-2 py-0.5 text-xs font-medium transition-all',
          value === 'AND'
            ? 'bg-cyan-500/20 text-cyan-400 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-300',
          disabled && 'cursor-not-allowed opacity-50'
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
            ? 'bg-orange-500/20 text-orange-400 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-300',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        OR
      </button>
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
      initial={isRoot ? false : { opacity: 0, y: -10 }}
      animate={{
        opacity: isEnabled ? 1 : 0.5,
        y: 0,
      }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-lg border',
        isRoot ? 'border-transparent' : 'border-zinc-700/50 bg-zinc-900/30',
        isOver && 'ring-2 ring-cyan-500/50',
        isDragging && 'opacity-50',
        !isEnabled && 'opacity-60'
      )}
    >
      {/* Group header */}
      <div
        className={cn(
          'flex items-center gap-2 p-2',
          !isRoot && 'cursor-pointer',
          !isRoot && 'hover:bg-zinc-800/30'
        )}
        onClick={!isRoot ? handleToggleExpand : undefined}
      >
        {/* Drag handle (non-root only) */}
        {!isRoot && (
          <div
            {...attributes}
            {...listeners}
            className={cn(
              'cursor-grab rounded p-1 text-zinc-500 hover:text-zinc-300',
              'active:cursor-grabbing'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} />
          </div>
        )}

        {/* Expand/collapse */}
        <button
          onClick={handleToggleExpand}
          className="rounded p-0.5 text-zinc-500 hover:text-zinc-300"
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
        <span className="flex-1 text-xs text-zinc-400">
          {!isRoot && (
            <>
              Group
              {children.length > 0 && (
                <span className="ml-2 text-zinc-500">
                  ({conditionCount} condition{conditionCount !== 1 ? 's' : ''}
                  {groupCount > 0 && `, ${groupCount} group${groupCount !== 1 ? 's' : ''}`})
                </span>
              )}
            </>
          )}
          {isRoot && children.length === 0 && (
            <span className="text-zinc-500 italic">
              Add conditions or groups to start filtering
            </span>
          )}
        </span>

        {/* Add buttons */}
        <button
          onClick={handleAddCondition}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-xs',
            'bg-cyan-500/10 text-cyan-400',
            'hover:bg-cyan-500/20 transition-colors'
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
          <FolderPlus size={14} />
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
                : 'text-zinc-500 hover:text-zinc-400'
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
              'rounded p-1 text-zinc-500 transition-colors',
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
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'flex flex-col gap-2',
                isRoot ? 'p-0' : 'p-3 pt-1',
                depth > 0 && 'border-l-2 border-zinc-700/30 ml-4'
              )}
            >
              {childNodes.map((childNode, index) => (
                <React.Fragment key={childNode.id}>
                  {/* Combinator separator (between items) */}
                  {index > 0 && (
                    <div className="flex items-center gap-2 pl-6">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          combinator === 'AND' ? 'text-cyan-500/60' : 'text-orange-500/60'
                        )}
                      >
                        {combinator}
                      </span>
                      <div className="flex-1 h-px bg-zinc-800" />
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
                </React.Fragment>
              ))}

              {/* Drop zone indicator */}
              {isOver && (
                <div className="rounded-lg border-2 border-dashed border-cyan-500/50 bg-cyan-500/5 p-4 text-center">
                  <span className="text-xs text-cyan-400">Drop here</span>
                </div>
              )}

              {/* Empty state */}
              {children.length === 0 && !isOver && (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-700 p-6">
                  <span className="text-xs text-zinc-500">
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
        'flex items-center gap-2 rounded-lg border border-zinc-700 p-3',
        'bg-zinc-900/90 backdrop-blur-sm shadow-lg shadow-cyan-500/30',
        'ring-2 ring-cyan-500'
      )}
    >
      <GripVertical size={16} className="text-cyan-400" />
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-xs font-medium',
          combinator === 'AND'
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'bg-orange-500/20 text-orange-400'
        )}
      >
        {combinator}
      </span>
      <span className="text-sm text-zinc-400">
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
      <span className="text-xs text-zinc-400">Match</span>
      <CombinatorToggle value={rootCombinator} onChange={setRootCombinator} />
      <span className="text-xs text-zinc-500">
        {COMBINATOR_LABELS[rootCombinator].description}
      </span>
    </div>
  );
}
