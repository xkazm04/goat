'use client';

/**
 * FacetPanel
 * Sidebar facet display with dynamic counts and drill-down
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type {
  Facet,
  FacetValue,
  FacetSelection,
  HierarchicalFacet,
  HierarchicalFacetNode,
  FacetActions,
} from '../types';
import { FILTER_ANIMATIONS } from '../../constants';

/**
 * FacetPanel Props
 */
interface FacetPanelProps {
  facets: Facet[];
  hierarchicalFacets?: HierarchicalFacet[];
  selections: FacetSelection[];
  onToggleValue: FacetActions['toggleFacetValue'];
  onClearFacet: FacetActions['clearFacet'];
  onClearAll: FacetActions['clearAllFacets'];
  onDrillDown?: FacetActions['drillDown'];
  onDrillUp?: FacetActions['drillUp'];
  className?: string;
  /** Search terms per facet for filtering values */
  facetSearchTerms?: Record<string, string>;
  onFacetSearchChange?: (facetId: string, term: string) => void;
  /** Show counts next to values */
  showCounts?: boolean;
  /** Show percentage bars */
  showBars?: boolean;
  /** Compact mode for sidebar */
  compact?: boolean;
}

/**
 * FacetPanel Component
 */
export function FacetPanel({
  facets,
  hierarchicalFacets = [],
  selections,
  onToggleValue,
  onClearFacet,
  onClearAll,
  onDrillDown,
  onDrillUp,
  className,
  facetSearchTerms = {},
  onFacetSearchChange,
  showCounts = true,
  showBars = true,
  compact = false,
}: FacetPanelProps) {
  // Track expanded facets locally
  const [expandedFacets, setExpandedFacets] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    facets.forEach((f) => {
      if (f.definition.defaultExpanded) initial.add(f.definition.id);
    });
    hierarchicalFacets.forEach((f) => {
      if (f.definition.defaultExpanded) initial.add(f.definition.id);
    });
    return initial;
  });

  const toggleFacetExpanded = useCallback((facetId: string) => {
    setExpandedFacets((prev) => {
      const next = new Set(prev);
      if (next.has(facetId)) {
        next.delete(facetId);
      } else {
        next.add(facetId);
      }
      return next;
    });
  }, []);

  // Count total active filters
  const totalActive = useMemo(() => {
    return selections.reduce((sum, s) => sum + s.values.length, 0);
  }, [selections]);

  return (
    <div
      className={cn(
        'flex flex-col',
        compact ? 'gap-2' : 'gap-4',
        className
      )}
    >
      {/* Header with clear all */}
      {totalActive > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium text-muted-foreground">
            {totalActive} filter{totalActive !== 1 ? 's' : ''} active
          </span>
          <button
            className="text-xs text-primary hover:text-primary/80 transition-colors"
            onClick={onClearAll}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Hierarchical facets first */}
      {hierarchicalFacets.map((facet) => (
        <HierarchicalFacetSection
          key={facet.definition.id}
          facet={facet}
          isExpanded={expandedFacets.has(facet.definition.id)}
          onToggleExpanded={() => toggleFacetExpanded(facet.definition.id)}
          onSelectValue={(value) => onToggleValue(facet.definition.id, value)}
          onClear={() => onClearFacet(facet.definition.id)}
          onDrillDown={onDrillDown}
          onDrillUp={onDrillUp}
          searchTerm={facetSearchTerms[facet.definition.id] ?? ''}
          onSearchChange={
            onFacetSearchChange
              ? (term) => onFacetSearchChange(facet.definition.id, term)
              : undefined
          }
          showCounts={showCounts}
          showBars={showBars}
          compact={compact}
        />
      ))}

      {/* Regular facets */}
      {facets.map((facet) => (
        <FacetSection
          key={facet.definition.id}
          facet={facet}
          isExpanded={expandedFacets.has(facet.definition.id)}
          onToggleExpanded={() => toggleFacetExpanded(facet.definition.id)}
          onSelectValue={(value) => onToggleValue(facet.definition.id, value)}
          onClear={() => onClearFacet(facet.definition.id)}
          searchTerm={facetSearchTerms[facet.definition.id] ?? ''}
          onSearchChange={
            onFacetSearchChange
              ? (term) => onFacetSearchChange(facet.definition.id, term)
              : undefined
          }
          showCounts={showCounts}
          showBars={showBars}
          compact={compact}
        />
      ))}
    </div>
  );
}

/**
 * Individual Facet Section
 */
interface FacetSectionProps {
  facet: Facet;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onSelectValue: (value: string | number | boolean) => void;
  onClear: () => void;
  searchTerm: string;
  onSearchChange?: (term: string) => void;
  showCounts: boolean;
  showBars: boolean;
  compact: boolean;
}

function FacetSection({
  facet,
  isExpanded,
  onToggleExpanded,
  onSelectValue,
  onClear,
  searchTerm,
  onSearchChange,
  showCounts,
  showBars,
  compact,
}: FacetSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = facet.definition.maxVisible ?? 10;

  // Filter values by search term
  const filteredValues = useMemo(() => {
    if (!searchTerm) return facet.values;
    const lower = searchTerm.toLowerCase();
    return facet.values.filter((v) =>
      v.label.toLowerCase().includes(lower)
    );
  }, [facet.values, searchTerm]);

  // Limit visible values
  const visibleValues = showAll
    ? filteredValues
    : filteredValues.slice(0, maxVisible);

  const hasMore = filteredValues.length > maxVisible;
  const selectedCount = facet.values.filter((v) => v.selected).length;

  return (
    <div
      className={cn(
        'border border-border rounded-lg overflow-hidden',
        compact ? 'text-sm' : ''
      )}
    >
      {/* Header */}
      <button
        className={cn(
          'w-full flex items-center justify-between',
          compact ? 'px-3 py-2' : 'px-4 py-3',
          'hover:bg-accent/50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset'
        )}
        onClick={onToggleExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{facet.definition.label}</span>
          {selectedCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {selectedCount}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground text-xs"
        >
          ▼
        </motion.span>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={FILTER_ANIMATIONS.transition}
            className="overflow-hidden"
          >
            <div className={cn('space-y-1', compact ? 'p-2' : 'p-3')}>
              {/* Search within facet */}
              {onSearchChange && facet.values.length > 5 && (
                <input
                  type="text"
                  placeholder={`Search ${facet.definition.label.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={cn(
                    'w-full px-2 py-1 text-sm rounded',
                    'bg-muted/50 border border-transparent',
                    'focus:border-border focus:outline-none',
                    'placeholder:text-muted-foreground/60',
                    'mb-2'
                  )}
                />
              )}

              {/* Facet values */}
              <div className="space-y-0.5">
                {visibleValues.map((value) => (
                  <FacetValueItem
                    key={String(value.value)}
                    value={value}
                    onSelect={() => onSelectValue(value.value)}
                    showCount={showCounts}
                    showBar={showBars}
                    compact={compact}
                  />
                ))}
              </div>

              {/* Show more / less */}
              {hasMore && (
                <button
                  className="w-full text-xs text-primary hover:text-primary/80 py-1 transition-colors"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll
                    ? 'Show less'
                    : `Show ${filteredValues.length - maxVisible} more`}
                </button>
              )}

              {/* Clear facet */}
              {selectedCount > 0 && (
                <button
                  className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                >
                  Clear {facet.definition.label.toLowerCase()}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Individual Facet Value Item
 */
interface FacetValueItemProps {
  value: FacetValue;
  onSelect: () => void;
  showCount: boolean;
  showBar: boolean;
  compact: boolean;
}

function FacetValueItem({
  value,
  onSelect,
  showCount,
  showBar,
  compact,
}: FacetValueItemProps) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-2 rounded transition-colors relative',
        compact ? 'px-2 py-1' : 'px-2 py-1.5',
        value.selected
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-accent/50'
      )}
      onClick={onSelect}
    >
      {/* Checkbox indicator */}
      <span
        className={cn(
          'flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center',
          'transition-colors',
          value.selected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-border'
        )}
      >
        {value.selected && <span className="text-xs">✓</span>}
      </span>

      {/* Label */}
      <span className="flex-1 text-left truncate">{value.label}</span>

      {/* Count */}
      {showCount && (
        <span
          className={cn(
            'flex-shrink-0 text-xs',
            value.selected ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          ({value.count})
        </span>
      )}

      {/* Percentage bar */}
      {showBar && value.percentage > 0 && (
        <div
          className={cn(
            'absolute bottom-0 left-0 h-0.5 rounded-full',
            value.selected ? 'bg-primary/40' : 'bg-muted'
          )}
          style={{ width: `${Math.min(value.percentage, 100)}%` }}
        />
      )}
    </button>
  );
}

/**
 * Hierarchical Facet Section (Category > Subcategory)
 */
interface HierarchicalFacetSectionProps {
  facet: HierarchicalFacet;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onSelectValue: (value: string) => void;
  onClear: () => void;
  onDrillDown?: FacetActions['drillDown'];
  onDrillUp?: FacetActions['drillUp'];
  searchTerm: string;
  onSearchChange?: (term: string) => void;
  showCounts: boolean;
  showBars: boolean;
  compact: boolean;
}

function HierarchicalFacetSection({
  facet,
  isExpanded,
  onToggleExpanded,
  onSelectValue,
  onClear,
  onDrillDown,
  onDrillUp,
  searchTerm,
  onSearchChange,
  showCounts,
  showBars,
  compact,
}: HierarchicalFacetSectionProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Auto-expand nodes with selected children
    const expanded = new Set<string>();
    for (const node of facet.nodes) {
      if (node.selected || node.children.some((c) => c.selected)) {
        expanded.add(node.value);
      }
    }
    return expanded;
  });

  const toggleNode = useCallback((value: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  // Filter nodes by search
  const filteredNodes = useMemo(() => {
    if (!searchTerm) return facet.nodes;
    const lower = searchTerm.toLowerCase();
    return facet.nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(lower) ||
        n.children.some((c) => c.label.toLowerCase().includes(lower))
    );
  }, [facet.nodes, searchTerm]);

  const selectedCount = facet.nodes.reduce(
    (sum, n) =>
      sum + (n.selected ? 1 : 0) + n.children.filter((c) => c.selected).length,
    0
  );

  return (
    <div
      className={cn(
        'border border-border rounded-lg overflow-hidden',
        compact ? 'text-sm' : ''
      )}
    >
      {/* Header */}
      <button
        className={cn(
          'w-full flex items-center justify-between',
          compact ? 'px-3 py-2' : 'px-4 py-3',
          'hover:bg-accent/50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset'
        )}
        onClick={onToggleExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{facet.definition.label}</span>
          {selectedCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {selectedCount}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground text-xs"
        >
          ▼
        </motion.span>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={FILTER_ANIMATIONS.transition}
            className="overflow-hidden"
          >
            <div className={cn('space-y-1', compact ? 'p-2' : 'p-3')}>
              {/* Breadcrumb path */}
              {facet.expandedPath.length > 0 && onDrillUp && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <button
                    className="hover:text-foreground transition-colors"
                    onClick={() => onDrillUp(facet.definition.id)}
                  >
                    ← Back
                  </button>
                  <span>/</span>
                  {facet.expandedPath.map((segment, i) => (
                    <React.Fragment key={segment}>
                      {i > 0 && <span>/</span>}
                      <span>{segment}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Search */}
              {onSearchChange && facet.nodes.length > 5 && (
                <input
                  type="text"
                  placeholder={`Search ${facet.definition.label.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={cn(
                    'w-full px-2 py-1 text-sm rounded',
                    'bg-muted/50 border border-transparent',
                    'focus:border-border focus:outline-none',
                    'placeholder:text-muted-foreground/60',
                    'mb-2'
                  )}
                />
              )}

              {/* Hierarchical nodes */}
              <div className="space-y-0.5">
                {filteredNodes.map((node) => (
                  <HierarchicalNodeItem
                    key={node.value}
                    node={node}
                    isExpanded={expandedNodes.has(node.value)}
                    onToggleExpand={() => toggleNode(node.value)}
                    onSelect={(value) => onSelectValue(value)}
                    onDrillDown={
                      onDrillDown
                        ? (path) => onDrillDown(facet.definition.id, path)
                        : undefined
                    }
                    showCounts={showCounts}
                    showBars={showBars}
                    compact={compact}
                  />
                ))}
              </div>

              {/* Clear */}
              {selectedCount > 0 && (
                <button
                  className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                >
                  Clear {facet.definition.label.toLowerCase()}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hierarchical Node Item with children
 */
interface HierarchicalNodeItemProps {
  node: HierarchicalFacetNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect: (value: string) => void;
  onDrillDown?: (path: string[]) => void;
  showCounts: boolean;
  showBars: boolean;
  compact: boolean;
  depth?: number;
}

function HierarchicalNodeItem({
  node,
  isExpanded,
  onToggleExpand,
  onSelect,
  onDrillDown,
  showCounts,
  showBars,
  compact,
  depth = 0,
}: HierarchicalNodeItemProps) {
  const hasChildren = node.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <div
        className={cn(
          'flex items-center gap-2 rounded transition-colors relative',
          compact ? 'px-2 py-1' : 'px-2 py-1.5',
          node.selected ? 'bg-primary/10 text-primary' : 'hover:bg-accent/50'
        )}
      >
        {/* Expand toggle for nodes with children */}
        {hasChildren && (
          <button
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <motion.span
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs"
            >
              ▶
            </motion.span>
          </button>
        )}

        {/* Checkbox */}
        <button
          className={cn(
            'flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center',
            'transition-colors',
            node.selected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-border hover:border-primary'
          )}
          onClick={() => onSelect(node.value)}
        >
          {node.selected && <span className="text-xs">✓</span>}
        </button>

        {/* Label - clickable to drill down if has children */}
        <button
          className="flex-1 text-left truncate"
          onClick={() => {
            if (hasChildren && onDrillDown) {
              onDrillDown([node.value]);
            } else {
              onSelect(node.value);
            }
          }}
        >
          {node.label}
        </button>

        {/* Count */}
        {showCounts && (
          <span
            className={cn(
              'flex-shrink-0 text-xs',
              node.selected ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            ({node.count})
          </span>
        )}
      </div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 mt-0.5">
              {node.children.map((child) => (
                <HierarchicalNodeItem
                  key={child.value}
                  node={child}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                  onSelect={onSelect}
                  showCounts={showCounts}
                  showBars={showBars}
                  compact={compact}
                  depth={depth + 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FacetPanel;
