'use client';

/**
 * SortSelector
 * UI for selecting sort field and direction, composes with active filters
 */

import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortConfig, SortDirection, FilterFieldDefinition } from '../types';
import { DEFAULT_FILTER_FIELDS } from '../constants';
import { useFilterIntegrationOptional } from '../CollectionFilterIntegration';

/**
 * Default sort options derived from sortable fields
 */
export interface SortOption {
  field: string;
  label: string;
  defaultDirection: SortDirection;
}

/**
 * SortSelector Props
 */
interface SortSelectorProps {
  sortConfig?: SortConfig | null;
  onChange?: (sort: SortConfig | null) => void;
  fields?: FilterFieldDefinition[];
  sortOptions?: SortOption[];
  className?: string;
  variant?: 'default' | 'compact' | 'inline';
}

/**
 * Build sort options from field definitions
 */
function buildSortOptions(fields: FilterFieldDefinition[]): SortOption[] {
  return fields
    .filter((f) => f.sortable)
    .map((f) => ({
      field: f.field,
      label: f.name,
      defaultDirection: f.type === 'number' || f.type === 'date' ? 'desc' as SortDirection : 'asc' as SortDirection,
    }));
}

/**
 * Additional default sort options
 */
const EXTRA_SORT_OPTIONS: SortOption[] = [
  { field: 'title', label: 'Alphabetical', defaultDirection: 'asc' },
  { field: 'created_at', label: 'Date Added', defaultDirection: 'desc' },
  { field: 'ranking', label: 'Rating', defaultDirection: 'desc' },
];

/**
 * SortSelector Component
 */
export function SortSelector({
  sortConfig: propSort,
  onChange: propOnChange,
  fields = DEFAULT_FILTER_FIELDS,
  sortOptions: customOptions,
  className,
  variant = 'default',
}: SortSelectorProps) {
  const context = useFilterIntegrationOptional();

  const sortConfig = propSort ?? context?.sortConfig ?? null;
  const onChange = propOnChange ?? context?.setSortConfig;

  const options = useMemo(() => {
    if (customOptions) return customOptions;
    const fromFields = buildSortOptions(fields);
    // Merge with extra options, avoiding duplicates
    const fieldSet = new Set(fromFields.map((f) => f.field));
    const extras = EXTRA_SORT_OPTIONS.filter((o) => !fieldSet.has(o.field));
    return [...fromFields, ...extras];
  }, [fields, customOptions]);

  const handleSelectField = useCallback(
    (field: string) => {
      if (!onChange) return;
      const option = options.find((o) => o.field === field);
      if (!option) return;

      if (sortConfig?.field === field) {
        // Toggle direction
        onChange({
          ...sortConfig,
          direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
        });
      } else {
        onChange({
          field,
          direction: option.defaultDirection,
          label: option.label,
        });
      }
    },
    [onChange, options, sortConfig]
  );

  const handleClear = useCallback(() => {
    onChange?.(null);
  }, [onChange]);

  if (variant === 'compact') {
    return (
      <CompactSortSelector
        sortConfig={sortConfig}
        options={options}
        onSelect={handleSelectField}
        onClear={handleClear}
        className={className}
      />
    );
  }

  if (variant === 'inline') {
    return (
      <InlineSortSelector
        sortConfig={sortConfig}
        options={options}
        onSelect={handleSelectField}
        onClear={handleClear}
        className={className}
      />
    );
  }

  return (
    <DefaultSortSelector
      sortConfig={sortConfig}
      options={options}
      onSelect={handleSelectField}
      onClear={handleClear}
      className={className}
    />
  );
}

/**
 * Default Sort Selector - dropdown style
 */
function DefaultSortSelector({
  sortConfig,
  options,
  onSelect,
  onClear,
  className,
}: {
  sortConfig: SortConfig | null;
  options: SortOption[];
  onSelect: (field: string) => void;
  onClear: () => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('relative', className)}>
      <button
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
          sortConfig
            ? 'border-brand/50 bg-brand/10 text-brand-hover'
            : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ArrowUpDown size={14} />
        <span>
          {sortConfig
            ? `${sortConfig.label || sortConfig.field}`
            : 'Sort by...'}
        </span>
        {sortConfig && (
          <span className="text-xs opacity-70">
            {sortConfig.direction === 'asc' ? (
              <ArrowUp size={12} />
            ) : (
              <ArrowDown size={12} />
            )}
          </span>
        )}
        {sortConfig && (
          <button
            className="ml-1 p-0.5 rounded hover:bg-zinc-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <X size={12} />
          </button>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className={cn(
                'absolute z-20 top-full mt-1 right-0 w-48',
                'bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden'
              )}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <div className="py-1">
                {options.map((option) => {
                  const isActive = sortConfig?.field === option.field;
                  return (
                    <button
                      key={option.field}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm',
                        'transition-colors',
                        isActive
                          ? 'bg-brand/10 text-brand-hover'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      )}
                      onClick={() => {
                        onSelect(option.field);
                        if (!isActive) setIsOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {isActive && (
                        <motion.span
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                        >
                          {sortConfig?.direction === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )}
                        </motion.span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact Sort Selector - small button
 */
function CompactSortSelector({
  sortConfig,
  options,
  onSelect,
  onClear,
  className,
}: {
  sortConfig: SortConfig | null;
  options: SortOption[];
  onSelect: (field: string) => void;
  onClear: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <select
        className={cn(
          'px-2 py-1 text-xs rounded border bg-transparent cursor-pointer',
          'focus:outline-hidden',
          sortConfig
            ? 'border-brand/50 text-brand-hover'
            : 'border-zinc-700 text-zinc-400'
        )}
        value={sortConfig?.field || ''}
        onChange={(e) => {
          if (e.target.value) {
            onSelect(e.target.value);
          } else {
            onClear();
          }
        }}
      >
        <option value="">Sort...</option>
        {options.map((opt) => (
          <option key={opt.field} value={opt.field}>
            {opt.label}
          </option>
        ))}
      </select>
      {sortConfig && (
        <button
          className={cn(
            'p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors'
          )}
          onClick={() =>
            onSelect(sortConfig.field) // toggles direction
          }
          title={`Sort ${sortConfig.direction === 'asc' ? 'descending' : 'ascending'}`}
        >
          {sortConfig.direction === 'asc' ? (
            <ArrowUp size={12} />
          ) : (
            <ArrowDown size={12} />
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Inline Sort Selector - chip-style buttons
 */
function InlineSortSelector({
  sortConfig,
  options,
  onSelect,
  onClear,
  className,
}: {
  sortConfig: SortConfig | null;
  options: SortOption[];
  onSelect: (field: string) => void;
  onClear: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-xs text-zinc-500">Sort:</span>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {options.map((option) => {
          const isActive = sortConfig?.field === option.field;
          return (
            <button
              key={option.field}
              className={cn(
                'shrink-0 inline-flex items-center gap-1',
                'px-2 py-1 rounded text-xs border transition-colors',
                isActive
                  ? 'bg-brand/10 border-brand/50 text-brand-hover'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
              )}
              onClick={() => onSelect(option.field)}
            >
              <span>{option.label}</span>
              {isActive && (
                sortConfig?.direction === 'asc' ? (
                  <ArrowUp size={10} />
                ) : (
                  <ArrowDown size={10} />
                )
              )}
            </button>
          );
        })}
        {sortConfig && (
          <button
            className="shrink-0 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={onClear}
            title="Clear sort"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
