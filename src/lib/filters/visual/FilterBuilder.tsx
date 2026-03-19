'use client';

/**
 * FilterBuilder
 * Main visual filter builder interface with drag-and-drop composition
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import {
  Undo2,
  Redo2,
  Plus,
  Keyboard,
} from 'lucide-react';
import { GoatFilter, GoatSparkles, GoatFolderGroup } from '@/components/visual/GoatIcons';
import { cn } from '@/lib/utils';
import {
  useFilterBuilderStore,
  useFilterBuilderNodes,
  useFilterBuilderRootIds,
  useFilterBuilderActiveNode,
  useCanUndo,
  useCanRedo,
  useFilterBuilderConditionCount,
  type FilterTreeNode,
} from '@/stores/filter-builder-store';
import { FilterBlock, FilterBlockOverlay } from './FilterBlock';
import { FilterGroup, FilterGroupOverlay, RootCombinatorToggle } from './FilterGroup';
import { FilterPreview } from './FilterPreview';
import { FilterSaver } from './FilterSaver';
import { FILTER_TIMING } from '@/lib/filters/constants';
import type { FilterConfig } from '@/lib/filters/types';
import { useFilterBuilderSync } from '@/lib/filters/useFilterBuilderSync';

interface FilterBuilderProps<T extends Record<string, unknown>> {
  items?: T[];
  initialConfig?: FilterConfig;
  onChange?: (config: FilterConfig) => void;
  onApply?: (config: FilterConfig) => void;
  className?: string;
  showPreview?: boolean;
  showSaver?: boolean;
  showToolbar?: boolean;
  /**
   * When true and a FilterIntegrationProvider is present in the tree,
   * the builder auto-syncs its output into the provider on every change.
   * Set to false to only push on explicit "Apply" clicks.
   * @default false
   */
  syncWithProvider?: boolean;
  renderPreviewItem?: (item: T, index: number) => React.ReactNode;
}

/**
 * Toolbar with actions
 */
function FilterBuilderToolbar({
  onAddCondition,
  onAddGroup,
}: {
  onAddCondition: () => void;
  onAddGroup: () => void;
}) {
  const { undo, redo, clearAll } = useFilterBuilderStore();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const conditionCount = useFilterBuilderConditionCount();

  return (
    <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
      <div className="flex items-center gap-2">
        <GoatFilter size={20} className="text-primary" />
        <span className="font-medium text-foreground font-grotesk">Filter Builder</span>
        {conditionCount > 0 && (
          <span className="rounded-badge bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
            {conditionCount} condition{conditionCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1 mr-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={cn(
              'rounded p-1.5 transition-colors',
              canUndo
                ? 'text-muted-foreground hover:text-foreground filter-hover'
                : 'text-muted-foreground filter-disabled'
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={cn(
              'rounded p-1.5 transition-colors',
              canRedo
                ? 'text-muted-foreground hover:text-foreground filter-hover'
                : 'text-muted-foreground filter-disabled'
            )}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        {/* Add buttons */}
        <button
          onClick={onAddCondition}
          className={cn(
            'flex items-center gap-2 rounded-control px-3 py-1.5 text-sm',
            'bg-primary/10 text-primary hover:bg-primary/20 transition-colors'
          )}
        >
          <Plus size={14} />
          Add Condition
        </button>

        <button
          onClick={onAddGroup}
          className={cn(
            'flex items-center gap-2 rounded-control px-3 py-1.5 text-sm',
            'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors'
          )}
        >
          <GoatFolderGroup size={14} />
          Add Group
        </button>
      </div>
    </div>
  );
}

/**
 * Keyboard shortcuts hint
 */
function KeyboardShortcuts() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
      <div className="flex items-center gap-1">
        <Keyboard size={12} />
        <span>Shortcuts:</span>
      </div>
      <span>
        <kbd className="rounded bg-muted px-1 font-mono">Ctrl+Z</kbd> Undo
      </span>
      <span>
        <kbd className="rounded bg-muted px-1 font-mono">Ctrl+Y</kbd> Redo
      </span>
      <span>
        <kbd className="rounded bg-muted px-1 font-mono">Del</kbd> Remove selected
      </span>
    </div>
  );
}

/**
 * Empty state
 */
function EmptyState({
  onAddCondition,
  onAddGroup,
}: {
  onAddCondition: () => void;
  onAddGroup: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-card border-2 border-dashed border-border p-12"
    >
      <GoatSparkles size={48} className="text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2 font-grotesk">
        Build Your Filter
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        Create powerful filters by adding conditions and groups. Drag and drop to
        reorganize, and combine with AND/OR logic.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onAddCondition}
          className={cn(
            'flex items-center gap-2 rounded-control px-4 py-2',
            'bg-primary text-primary-foreground hover:bg-primary/80 transition-colors'
          )}
        >
          <Plus size={18} />
          Add First Condition
        </button>
        <span className="text-muted-foreground">or</span>
        <button
          onClick={onAddGroup}
          className={cn(
            'flex items-center gap-2 rounded-control px-4 py-2',
            'bg-muted text-foreground filter-hover transition-colors'
          )}
        >
          <GoatFolderGroup size={18} />
          Create Group
        </button>
      </div>
    </motion.div>
  );
}

/**
 * FilterBuilder main component
 */
export function FilterBuilder<T extends Record<string, unknown>>({
  items = [],
  initialConfig,
  onChange,
  onApply,
  className,
  showPreview = true,
  showSaver = true,
  showToolbar = true,
  syncWithProvider = false,
  renderPreviewItem,
}: FilterBuilderProps<T>) {
  const {
    addCondition,
    addGroup,
    moveNode,
    setActiveNode,
    removeNode,
    undo,
    redo,
    fromFilterConfig,
    toFilterConfig,
    selectedNodeId,
  } = useFilterBuilderStore();

  // Bridge: sync builder output → FilterIntegrationProvider when opted in
  const { applyNow: syncToProvider } = useFilterBuilderSync({ syncOnChange: syncWithProvider });

  const nodes = useFilterBuilderNodes();
  const rootIds = useFilterBuilderRootIds();
  const activeNodeId = useFilterBuilderActiveNode();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  // Load initial config
  useEffect(() => {
    if (initialConfig) {
      fromFilterConfig(initialConfig);
    }
  }, [initialConfig, fromFilterConfig]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      const config = toFilterConfig();
      onChange(config);
    }
  }, [nodes, rootIds, onChange, toFilterConfig]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          removeNode(selectedNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, undo, redo, removeNode]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get active node for drag overlay
  const activeNode = useMemo(() => {
    if (!activeNodeId) return null;
    return nodes[activeNodeId] || null;
  }, [activeNodeId, nodes]);

  // Create virtual root node for rendering
  const virtualRootNode: FilterTreeNode = useMemo(
    () => ({
      id: 'root',
      type: 'group',
      parentId: null,
      order: 0,
      group: {
        id: 'root',
        combinator: 'AND',
        enabled: true,
      },
      children: rootIds,
    }),
    [rootIds]
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveNode(event.active.id as string);
    },
    [setActiveNode]
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Drop zone highlighting handled by DropZoneIndicator components in FilterGroup
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveNode(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Get drop zone data
      const dropData = over.data.current;
      if (!dropData) return;

      if (dropData.type === 'zone') {
        // Dropping into a zone
        moveNode(activeId, dropData.parentId, dropData.index);
      } else if (dropData.type === 'condition' || dropData.type === 'group') {
        // Dropping onto another node - insert after it
        const targetNode = nodes[overId];
        if (!targetNode) return;

        const siblings = targetNode.parentId
          ? nodes[targetNode.parentId]?.children || []
          : rootIds;
        const targetIndex = siblings.indexOf(overId);

        moveNode(activeId, targetNode.parentId, targetIndex + 1);
      }
    },
    [setActiveNode, moveNode, nodes, rootIds]
  );

  const handleDragCancel = useCallback(() => {
    setActiveNode(null);
  }, [setActiveNode]);

  // Handlers
  const handleAddCondition = useCallback(() => {
    addCondition(null);
  }, [addCondition]);

  const handleAddGroup = useCallback(() => {
    addGroup(null);
  }, [addGroup]);

  const handleApply = useCallback(() => {
    const config = toFilterConfig();
    // Push to integration provider (no-op if not in provider tree)
    syncToProvider();
    if (onApply) {
      onApply(config);
    }
  }, [onApply, toFilterConfig, syncToProvider]);

  const isEmpty = rootIds.length === 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <FilterBuilderToolbar
          onAddCondition={handleAddCondition}
          onAddGroup={handleAddGroup}
        />
      )}

      {/* Root combinator */}
      {!isEmpty && (
        <div className="flex items-center justify-between">
          <RootCombinatorToggle />
        </div>
      )}

      {/* Main builder area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {isEmpty ? (
          <EmptyState
            onAddCondition={handleAddCondition}
            onAddGroup={handleAddGroup}
          />
        ) : (
          <div className="rounded-card border border-border/50 bg-background/30 p-4">
            <FilterGroup nodeId="root" node={virtualRootNode} isRoot />
          </div>
        )}

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeNode && (
            activeNode.type === 'condition' && activeNode.condition ? (
              <FilterBlockOverlay condition={activeNode.condition} />
            ) : activeNode.type === 'group' ? (
              <FilterGroupOverlay
                combinator={activeNode.group?.combinator || 'AND'}
                childCount={activeNode.children?.length || 0}
              />
            ) : null
          )}
        </DragOverlay>
      </DndContext>

      {/* Saver */}
      {showSaver && <FilterSaver />}

      {/* Preview */}
      {showPreview && items.length > 0 && (
        <FilterPreview
          items={items}
          renderItem={renderPreviewItem}
        />
      )}

      {/* Apply button */}
      {onApply && !isEmpty && (
        <div className="flex justify-end">
          <button
            onClick={handleApply}
            className={cn(
              'flex items-center gap-2 rounded-control px-6 py-2',
              'bg-primary text-primary-foreground font-medium',
              'hover:bg-primary/80 transition-colors'
            )}
          >
            <GoatFilter size={18} />
            Apply Filters
          </button>
        </div>
      )}

      {/* Keyboard shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}

/**
 * Compact filter builder for inline use
 */
export function CompactFilterBuilder<T extends Record<string, unknown>>({
  items = [],
  onChange,
  className,
}: {
  items?: T[];
  onChange?: (config: FilterConfig) => void;
  className?: string;
}) {
  return (
    <FilterBuilder
      items={items}
      onChange={onChange}
      className={className}
      showPreview={false}
      showSaver={false}
      showToolbar={false}
    />
  );
}
