'use client';

/**
 * QuickFilterBar
 * Chip-based common filters for quick access
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { QuickFilter, FilterConfig } from '../types';
import { FILTER_ANIMATIONS, DEFAULT_QUICK_FILTERS } from '../constants';

/**
 * QuickFilterBar Props
 */
interface QuickFilterBarProps {
  filters?: QuickFilter[];
  activeFilters: string[];
  onToggle: (filterId: string) => void;
  onClear?: () => void;
  showClearAll?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'pills';
  /** Count of items matching each filter */
  filterCounts?: Record<string, number>;
}

/**
 * QuickFilterBar Component
 */
export function QuickFilterBar({
  filters = DEFAULT_QUICK_FILTERS,
  activeFilters,
  onToggle,
  onClear,
  showClearAll = true,
  className,
  variant = 'default',
  filterCounts,
}: QuickFilterBarProps) {
  const hasActiveFilters = activeFilters.length > 0;

  // Render based on variant
  switch (variant) {
    case 'compact':
      return (
        <CompactQuickFilters
          filters={filters}
          activeFilters={activeFilters}
          onToggle={onToggle}
          filterCounts={filterCounts}
          className={className}
        />
      );
    case 'pills':
      return (
        <PillQuickFilters
          filters={filters}
          activeFilters={activeFilters}
          onToggle={onToggle}
          onClear={onClear}
          showClearAll={showClearAll}
          filterCounts={filterCounts}
          className={className}
        />
      );
    default:
      return (
        <DefaultQuickFilters
          filters={filters}
          activeFilters={activeFilters}
          onToggle={onToggle}
          onClear={onClear}
          showClearAll={showClearAll}
          filterCounts={filterCounts}
          className={className}
        />
      );
  }
}

/**
 * Default Quick Filters (horizontal scrollable)
 */
function DefaultQuickFilters({
  filters,
  activeFilters,
  onToggle,
  onClear,
  showClearAll,
  filterCounts,
  className,
}: Omit<QuickFilterBarProps, 'variant'> & { filters: QuickFilter[] }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {filters.map((filter, index) => (
            <QuickFilterChip
              key={filter.id}
              filter={filter}
              isActive={activeFilters.includes(filter.id)}
              count={filterCounts?.[filter.id]}
              onToggle={() => onToggle(filter.id)}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Clear all */}
      {showClearAll && activeFilters.length > 0 && onClear && (
        <motion.button
          className={cn(
            'flex-shrink-0 px-2 py-1 text-xs',
            'text-muted-foreground hover:text-foreground',
            'transition-colors'
          )}
          onClick={onClear}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
        >
          Clear
        </motion.button>
      )}
    </div>
  );
}

/**
 * Compact Quick Filters (icon-only)
 */
function CompactQuickFilters({
  filters,
  activeFilters,
  onToggle,
  filterCounts,
  className,
}: Omit<QuickFilterBarProps, 'variant' | 'onClear' | 'showClearAll'> & { filters: QuickFilter[] }) {
  return (
    <div
      className={cn(
        'inline-flex bg-muted rounded-lg p-1',
        className
      )}
      role="group"
    >
      {filters.map((filter) => {
        const isActive = activeFilters.includes(filter.id);
        const count = filterCounts?.[filter.id];

        return (
          <motion.button
            key={filter.id}
            className={cn(
              'relative px-2 py-1.5 rounded-md transition-colors',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onToggle(filter.id)}
            title={`${filter.label}${count !== undefined ? ` (${count})` : ''}`}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 bg-primary rounded-md"
                layoutId="quick-filter-indicator"
                transition={FILTER_ANIMATIONS.transition}
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              {filter.icon || '🔍'}
              {count !== undefined && (
                <span className="text-[10px] opacity-70">{count}</span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Pill Quick Filters (rounded pills)
 */
function PillQuickFilters({
  filters,
  activeFilters,
  onToggle,
  onClear,
  showClearAll,
  filterCounts,
  className,
}: Omit<QuickFilterBarProps, 'variant'> & { filters: QuickFilter[] }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {filters.map((filter) => {
        const isActive = activeFilters.includes(filter.id);
        const count = filterCounts?.[filter.id];

        return (
          <motion.button
            key={filter.id}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
              'text-sm font-medium transition-all',
              'border',
              isActive
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:border-primary/50 hover:bg-accent/50'
            )}
            onClick={() => onToggle(filter.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            layout
          >
            {filter.icon && <span>{filter.icon}</span>}
            <span>{filter.label}</span>
            {count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs',
                  isActive ? 'bg-primary-foreground/20' : 'bg-muted'
                )}
              >
                {count}
              </span>
            )}
          </motion.button>
        );
      })}

      {/* Clear button */}
      {showClearAll && activeFilters.length > 0 && onClear && (
        <motion.button
          className={cn(
            'inline-flex items-center px-3 py-1.5 rounded-full',
            'text-sm text-muted-foreground hover:text-foreground',
            'border border-dashed border-border hover:border-destructive',
            'transition-colors'
          )}
          onClick={onClear}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          Clear All
        </motion.button>
      )}
    </div>
  );
}

/**
 * QuickFilterChip Props
 */
interface QuickFilterChipProps {
  filter: QuickFilter;
  isActive: boolean;
  count?: number;
  onToggle: () => void;
  index: number;
}

/**
 * QuickFilterChip Component
 */
function QuickFilterChip({
  filter,
  isActive,
  count,
  onToggle,
  index,
}: QuickFilterChipProps) {
  return (
    <motion.button
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1.5',
        'px-3 py-1.5 rounded-lg text-sm',
        'border transition-all',
        isActive
          ? 'bg-primary/10 border-primary text-primary'
          : 'bg-background border-border hover:border-primary/50'
      )}
      onClick={onToggle}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * FILTER_ANIMATIONS.stagger.staggerChildren }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {filter.icon && <span>{filter.icon}</span>}
      <span className="font-medium">{filter.label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'px-1.5 min-w-[20px] text-center text-xs rounded-full',
            isActive ? 'bg-primary/20' : 'bg-muted'
          )}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}

/**
 * Quick Filter Group - groups filters by category
 */
interface QuickFilterGroupProps {
  title: string;
  filters: QuickFilter[];
  activeFilters: string[];
  onToggle: (filterId: string) => void;
  filterCounts?: Record<string, number>;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function QuickFilterGroup({
  title,
  filters,
  activeFilters,
  onToggle,
  filterCounts,
  collapsed = false,
  onToggleCollapse,
  className,
}: QuickFilterGroupProps) {
  const activeInGroup = filters.filter((f) =>
    activeFilters.includes(f.id)
  ).length;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Group Header */}
      <button
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={onToggleCollapse}
      >
        <motion.span
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
        <span>{title}</span>
        {activeInGroup > 0 && (
          <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
            {activeInGroup}
          </span>
        )}
      </button>

      {/* Group Content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="flex flex-wrap gap-2 pl-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={FILTER_ANIMATIONS.transition}
          >
            {filters.map((filter, index) => (
              <QuickFilterChip
                key={filter.id}
                filter={filter}
                isActive={activeFilters.includes(filter.id)}
                count={filterCounts?.[filter.id]}
                onToggle={() => onToggle(filter.id)}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * SearchableQuickFilters - with search input
 */
interface SearchableQuickFiltersProps {
  filters: QuickFilter[];
  activeFilters: string[];
  onToggle: (filterId: string) => void;
  filterCounts?: Record<string, number>;
  placeholder?: string;
  className?: string;
}

export function SearchableQuickFilters({
  filters,
  activeFilters,
  onToggle,
  filterCounts,
  placeholder = 'Search filters...',
  className,
}: SearchableQuickFiltersProps) {
  const [search, setSearch] = React.useState('');

  const filteredFilters = useMemo(() => {
    if (!search.trim()) return filters;
    const lower = search.toLowerCase();
    return filters.filter(
      (f) =>
        f.label.toLowerCase().includes(lower) ||
        f.id.toLowerCase().includes(lower)
    );
  }, [filters, search]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          className={cn(
            'w-full px-3 py-2 pl-9 text-sm rounded-lg',
            'bg-background border border-border',
            'focus:outline-none focus:ring-2 focus:ring-ring'
          )}
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          🔍
        </span>
      </div>

      {/* Filters */}
      <QuickFilterBar
        filters={filteredFilters}
        activeFilters={activeFilters}
        onToggle={onToggle}
        filterCounts={filterCounts}
        variant="pills"
        showClearAll={false}
      />

      {/* No results */}
      {search && filteredFilters.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No filters matching "{search}"
        </p>
      )}
    </div>
  );
}
