'use client';

/**
 * FacetBreadcrumbs
 * Active filter trail showing all selected facet values
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { FacetBreadcrumb, FacetSelection, Facet, HierarchicalFacet } from '../types';
import { FILTER_ANIMATIONS } from '../../constants';

/**
 * FacetBreadcrumbs Props
 */
interface FacetBreadcrumbsProps {
  selections: FacetSelection[];
  facets: Facet[];
  hierarchicalFacets?: HierarchicalFacet[];
  onRemove: (facetId: string, value: string | number | boolean) => void;
  onClearAll: () => void;
  onClearFacet: (facetId: string) => void;
  className?: string;
  /** Maximum breadcrumbs to show before collapsing */
  maxVisible?: number;
  /** Compact mode */
  compact?: boolean;
  /** Show clear all button */
  showClearAll?: boolean;
}

/**
 * FacetBreadcrumbs Component
 */
export function FacetBreadcrumbs({
  selections,
  facets,
  hierarchicalFacets = [],
  onRemove,
  onClearAll,
  onClearFacet,
  className,
  maxVisible = 10,
  compact = false,
  showClearAll = true,
}: FacetBreadcrumbsProps) {
  // Build breadcrumb items from selections
  const breadcrumbs = useMemo(() => {
    const items: FacetBreadcrumb[] = [];

    for (const selection of selections) {
      // Find the facet definition
      const facet = facets.find((f) => f.definition.id === selection.facetId);
      const hierarchicalFacet = hierarchicalFacets.find(
        (f) => f.definition.id === selection.facetId
      );
      const definition = facet?.definition ?? hierarchicalFacet?.definition;

      if (!definition) continue;

      for (const value of selection.values) {
        // Find the value label
        let label = String(value);

        if (facet) {
          const facetValue = facet.values.find((v) => v.value === value);
          if (facetValue) label = facetValue.label;
        } else if (hierarchicalFacet) {
          // Search hierarchical nodes
          for (const node of hierarchicalFacet.nodes) {
            if (node.value === value) {
              label = node.label;
              break;
            }
            for (const child of node.children) {
              if (child.value === value) {
                label = child.label;
                break;
              }
            }
          }
        }

        items.push({
          id: `${selection.facetId}-${value}`,
          facetId: selection.facetId,
          facetLabel: definition.label,
          value,
          valueLabel: label,
        });
      }
    }

    return items;
  }, [selections, facets, hierarchicalFacets]);

  // Group by facet for collapsed view
  const groupedBreadcrumbs = useMemo(() => {
    const groups = new Map<string, FacetBreadcrumb[]>();
    for (const crumb of breadcrumbs) {
      const existing = groups.get(crumb.facetId) ?? [];
      existing.push(crumb);
      groups.set(crumb.facetId, existing);
    }
    return groups;
  }, [breadcrumbs]);

  if (breadcrumbs.length === 0) {
    return null;
  }

  // Determine if we need to collapse
  const shouldCollapse = breadcrumbs.length > maxVisible;
  const visibleBreadcrumbs = shouldCollapse
    ? breadcrumbs.slice(0, maxVisible)
    : breadcrumbs;
  const hiddenCount = shouldCollapse ? breadcrumbs.length - maxVisible : 0;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        compact ? 'text-xs' : 'text-sm',
        className
      )}
    >
      {/* Filter label */}
      <span className="text-muted-foreground font-medium">
        Filtered by:
      </span>

      {/* Breadcrumb chips */}
      <AnimatePresence mode="popLayout">
        {visibleBreadcrumbs.map((crumb, index) => (
          <motion.div
            key={crumb.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ ...FILTER_ANIMATIONS.chip, delay: index * 0.03 }}
          >
            <BreadcrumbChip
              crumb={crumb}
              onRemove={() => onRemove(crumb.facetId, crumb.value)}
              compact={compact}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Overflow indicator */}
      {hiddenCount > 0 && (
        <span className="text-muted-foreground">
          +{hiddenCount} more
        </span>
      )}

      {/* Clear all button */}
      {showClearAll && breadcrumbs.length > 1 && (
        <button
          className={cn(
            'text-primary hover:text-primary/80 transition-colors',
            'underline-offset-2 hover:underline'
          )}
          onClick={onClearAll}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/**
 * Individual Breadcrumb Chip
 */
interface BreadcrumbChipProps {
  crumb: FacetBreadcrumb;
  onRemove: () => void;
  compact: boolean;
}

function BreadcrumbChip({ crumb, onRemove, compact }: BreadcrumbChipProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        'bg-primary/10 text-primary border border-primary/20',
        compact ? 'px-2 py-0.5' : 'px-3 py-1'
      )}
    >
      {/* Facet label */}
      <span className="text-muted-foreground">{crumb.facetLabel}:</span>

      {/* Value label */}
      <span className="font-medium">{crumb.valueLabel}</span>

      {/* Remove button */}
      <button
        className={cn(
          'ml-1 rounded-full hover:bg-primary/20 transition-colors',
          compact ? 'w-4 h-4' : 'w-5 h-5',
          'flex items-center justify-center'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${crumb.facetLabel}: ${crumb.valueLabel} filter`}
      >
        <span className={compact ? 'text-xs' : 'text-sm'}>×</span>
      </button>
    </div>
  );
}

/**
 * Grouped Breadcrumbs - shows facets as groups
 */
interface GroupedFacetBreadcrumbsProps {
  selections: FacetSelection[];
  facets: Facet[];
  hierarchicalFacets?: HierarchicalFacet[];
  onRemove: (facetId: string, value: string | number | boolean) => void;
  onClearAll: () => void;
  onClearFacet: (facetId: string) => void;
  className?: string;
  compact?: boolean;
}

export function GroupedFacetBreadcrumbs({
  selections,
  facets,
  hierarchicalFacets = [],
  onRemove,
  onClearAll,
  onClearFacet,
  className,
  compact = false,
}: GroupedFacetBreadcrumbsProps) {
  // Build grouped breadcrumbs
  const groups = useMemo(() => {
    const result: Array<{
      facetId: string;
      facetLabel: string;
      values: Array<{ value: string | number | boolean; label: string }>;
    }> = [];

    for (const selection of selections) {
      const facet = facets.find((f) => f.definition.id === selection.facetId);
      const hierarchicalFacet = hierarchicalFacets.find(
        (f) => f.definition.id === selection.facetId
      );
      const definition = facet?.definition ?? hierarchicalFacet?.definition;

      if (!definition) continue;

      const values: Array<{ value: string | number | boolean; label: string }> = [];

      for (const value of selection.values) {
        let label = String(value);

        if (facet) {
          const facetValue = facet.values.find((v) => v.value === value);
          if (facetValue) label = facetValue.label;
        } else if (hierarchicalFacet) {
          for (const node of hierarchicalFacet.nodes) {
            if (node.value === value) {
              label = node.label;
              break;
            }
            for (const child of node.children) {
              if (child.value === value) {
                label = child.label;
                break;
              }
            }
          }
        }

        values.push({ value, label });
      }

      if (values.length > 0) {
        result.push({
          facetId: selection.facetId,
          facetLabel: definition.label,
          values,
        });
      }
    }

    return result;
  }, [selections, facets, hierarchicalFacets]);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        compact ? 'text-xs' : 'text-sm',
        className
      )}
    >
      <span className="text-muted-foreground font-medium">Filtered by:</span>

      <AnimatePresence mode="popLayout">
        {groups.map((group, index) => (
          <motion.div
            key={group.facetId}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ ...FILTER_ANIMATIONS.chip, delay: index * 0.05 }}
          >
            <GroupedBreadcrumbChip
              facetId={group.facetId}
              facetLabel={group.facetLabel}
              values={group.values}
              onRemoveValue={(value) => onRemove(group.facetId, value)}
              onClearFacet={() => onClearFacet(group.facetId)}
              compact={compact}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {groups.length > 1 && (
        <button
          className="text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline"
          onClick={onClearAll}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/**
 * Grouped Breadcrumb Chip - shows multiple values for one facet
 */
interface GroupedBreadcrumbChipProps {
  facetId: string;
  facetLabel: string;
  values: Array<{ value: string | number | boolean; label: string }>;
  onRemoveValue: (value: string | number | boolean) => void;
  onClearFacet: () => void;
  compact: boolean;
}

function GroupedBreadcrumbChip({
  facetLabel,
  values,
  onRemoveValue,
  onClearFacet,
  compact,
}: GroupedBreadcrumbChipProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Show collapsed if more than 2 values
  const shouldCollapse = values.length > 2;
  const displayValues = shouldCollapse && !isExpanded ? values.slice(0, 2) : values;

  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-lg',
        'bg-muted/50 border border-border',
        compact ? 'px-2 py-1' : 'px-3 py-1.5'
      )}
    >
      {/* Facet label */}
      <span className="text-muted-foreground font-medium mr-1">
        {facetLabel}:
      </span>

      {/* Values */}
      {displayValues.map((v, i) => (
        <React.Fragment key={String(v.value)}>
          {i > 0 && <span className="text-muted-foreground">,</span>}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full',
              'bg-primary/10 text-primary',
              compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
            )}
          >
            {v.label}
            <button
              className="hover:text-destructive transition-colors"
              onClick={() => onRemoveValue(v.value)}
            >
              ×
            </button>
          </span>
        </React.Fragment>
      ))}

      {/* Expand/collapse for many values */}
      {shouldCollapse && (
        <button
          className="text-primary hover:text-primary/80 text-xs"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'less' : `+${values.length - 2} more`}
        </button>
      )}

      {/* Clear facet */}
      {values.length > 1 && (
        <button
          className={cn(
            'ml-1 text-muted-foreground hover:text-foreground transition-colors',
            compact ? 'text-xs' : 'text-sm'
          )}
          onClick={onClearFacet}
          title={`Clear all ${facetLabel} filters`}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default FacetBreadcrumbs;
