'use client';

/**
 * SmartFilterSuggestions
 * Context-aware filter hints based on current results
 */

import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle } from 'lucide-react';
import React, { useMemo } from 'react';

import { GoatLightbulb, GoatTarget, GoatSearch } from '@/components/visual/GoatIcons';
import { cn } from '@/lib/utils';

import {
  SUGGESTION_TYPES,
  FILTER_ANIMATIONS,
  FILTER_TIMING,
  FILTER_SCALE,
  PERFORMANCE_THRESHOLDS,
} from '../constants';

import type {
  SmartFilterSuggestion,
  FilterConfig,
  FilterStatistics,
  FilterFieldDefinition,
} from '../types';

/**
 * Lucide icon mapping for suggestion types
 */
const SUGGESTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  narrow: <GoatTarget size={14} />,
  expand: <GoatSearch size={14} />,
  alternative: <GoatLightbulb size={14} />,
  complement: <PlusCircle size={14} />,
};

/**
 * SmartFilterSuggestions Props
 */
interface SmartFilterSuggestionsProps {
  suggestions: SmartFilterSuggestion[];
  currentConfig: FilterConfig;
  statistics: FilterStatistics | null;
  onApplySuggestion: (config: FilterConfig) => void;
  isLoading?: boolean;
  maxSuggestions?: number;
  className?: string;
  variant?: 'inline' | 'panel' | 'popover';
}

/**
 * SmartFilterSuggestions Component
 */
export function SmartFilterSuggestions({
  suggestions,
  currentConfig,
  statistics,
  onApplySuggestion,
  isLoading = false,
  maxSuggestions = PERFORMANCE_THRESHOLDS.maxSuggestions,
  className,
  variant = 'inline',
}: SmartFilterSuggestionsProps) {
  const visibleSuggestions = suggestions.slice(0, maxSuggestions);

  if (isLoading) {
    return <SuggestionsLoading variant={variant} className={className} />;
  }

  if (suggestions.length === 0) {
    return null;
  }

  switch (variant) {
    case 'panel':
      return (
        <PanelSuggestions
          suggestions={visibleSuggestions}
          onApply={onApplySuggestion}
          className={className}
        />
      );
    case 'popover':
      return (
        <PopoverSuggestions
          suggestions={visibleSuggestions}
          onApply={onApplySuggestion}
          className={className}
        />
      );
    default:
      return (
        <InlineSuggestions
          suggestions={visibleSuggestions}
          onApply={onApplySuggestion}
          className={className}
        />
      );
  }
}

/**
 * Inline Suggestions
 */
function InlineSuggestions({
  suggestions,
  onApply,
  className,
}: {
  suggestions: SmartFilterSuggestion[];
  onApply: (config: FilterConfig) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <GoatLightbulb size={12} />
        Try:
      </span>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion.id}
              className={cn(
                'shrink-0 inline-flex items-center gap-1',
                'px-2 py-1 text-xs rounded-control',
                'bg-accent/50 hover:bg-accent border border-border/50',
                'transition-colors'
              )}
              onClick={() => onApply(suggestion.config)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: index * FILTER_TIMING.stagger }}
              whileHover={{ scale: FILTER_SCALE.hover }}
              whileTap={{ scale: FILTER_SCALE.tap }}
              title={suggestion.description}
            >
              <span>{SUGGESTION_TYPE_ICONS[suggestion.type]}</span>
              <span>{suggestion.label}</span>
              <span className="text-muted-foreground">
                (~{suggestion.estimatedMatches})
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Panel Suggestions
 */
function PanelSuggestions({
  suggestions,
  onApply,
  className,
}: {
  suggestions: SmartFilterSuggestion[];
  onApply: (config: FilterConfig) => void;
  className?: string;
}) {
  // Group by type
  const grouped = useMemo(() => {
    const groups: Record<string, SmartFilterSuggestion[]> = {};
    for (const suggestion of suggestions) {
      if (!groups[suggestion.type]) {
        groups[suggestion.type] = [];
      }
      groups[suggestion.type].push(suggestion);
    }
    return groups;
  }, [suggestions]);

  return (
    <div
      className={cn(
        'p-4 rounded-card border border-border bg-background',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <GoatLightbulb size={18} className="text-amber-400" />
        <h4 className="text-sm font-medium font-grotesk">Smart Suggestions</h4>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([type, typeSuggestions]) => (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <span>{SUGGESTION_TYPE_ICONS[type]}</span>
              <span className="text-xs font-medium text-muted-foreground">
                {SUGGESTION_TYPES[type as keyof typeof SUGGESTION_TYPES]?.label}
              </span>
            </div>
            <div className="space-y-2">
              {typeSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onApply={() => onApply(suggestion.config)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Popover Suggestions
 */
function PopoverSuggestions({
  suggestions,
  onApply,
  className,
}: {
  suggestions: SmartFilterSuggestion[];
  onApply: (config: FilterConfig) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('relative', className)}>
      <button
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 text-xs rounded-control',
          'bg-amber-500/10 text-amber-600 border border-amber-500/20',
          'hover:bg-amber-500/20 transition-colors',
          suggestions.length === 0 && 'filter-disabled'
        )}
        onClick={() => setIsOpen(!isOpen)}
        disabled={suggestions.length === 0}
      >
        <GoatLightbulb size={12} />
        <span>{suggestions.length} suggestions</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Popover */}
            <motion.div
              className={cn(
                'absolute z-20 top-full mt-2 right-0 w-72',
                'bg-background border border-border rounded-card shadow-xl',
                'overflow-hidden'
              )}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={FILTER_ANIMATIONS.transition}
            >
              <div className="p-3 border-b border-border">
                <h4 className="text-sm font-medium font-grotesk">Smart Suggestions</h4>
                <p className="text-xs text-muted-foreground">
                  Click to apply a suggestion
                </p>
              </div>

              <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className={cn(
                      'w-full flex items-center gap-2 p-2 rounded-control',
                      'hover:bg-accent transition-colors text-left'
                    )}
                    onClick={() => {
                      onApply(suggestion.config);
                      setIsOpen(false);
                    }}
                  >
                    <span className="shrink-0">
                      {SUGGESTION_TYPE_ICONS[suggestion.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {suggestion.label}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        ~{suggestion.estimatedMatches} matches
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Suggestion Card
 */
function SuggestionCard({
  suggestion,
  onApply,
}: {
  suggestion: SmartFilterSuggestion;
  onApply: () => void;
}) {
  return (
    <motion.button
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-card',
        'border border-border bg-muted/30',
        'filter-hover hover:border-primary/30',
        'transition-all text-left'
      )}
      onClick={onApply}
      whileHover={{ scale: FILTER_SCALE.hover }}
      whileTap={{ scale: FILTER_SCALE.tap }}
    >
      <div className="flex-1">
        <div className="text-sm font-medium">{suggestion.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {suggestion.description}
        </div>
        {suggestion.reasoning && (
          <div className="text-xs text-muted-foreground mt-1 italic">
            "{suggestion.reasoning}"
          </div>
        )}
      </div>

      <div className="shrink-0 text-right">
        <div className="text-sm font-medium text-primary">
          ~{suggestion.estimatedMatches}
        </div>
        <div className="text-xs text-muted-foreground">
          {Math.round(suggestion.confidence * 100)}% match
        </div>
      </div>
    </motion.button>
  );
}

/**
 * Loading state
 */
function SuggestionsLoading({
  variant,
  className,
}: {
  variant: string;
  className?: string;
}) {
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 animate-pulse', className)}>
        <div className="h-4 w-12 bg-muted rounded" />
        <div className="h-6 w-24 bg-muted rounded" />
        <div className="h-6 w-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-card border border-border animate-pulse',
        className
      )}
    >
      <div className="h-5 w-32 bg-muted rounded mb-3" />
      <div className="space-y-2">
        <div className="h-12 bg-muted rounded" />
        <div className="h-12 bg-muted rounded" />
      </div>
    </div>
  );
}

/**
 * Generate smart suggestions based on current state
 */
export function generateSmartSuggestions(
  currentConfig: FilterConfig,
  statistics: FilterStatistics | null,
  fields: FilterFieldDefinition[],
  allItems: unknown[]
): SmartFilterSuggestion[] {
  const suggestions: SmartFilterSuggestion[] = [];

  if (!statistics) return suggestions;

  const { matchedItems, totalItems, fieldDistribution } = statistics;
  const matchPercentage = totalItems > 0 ? (matchedItems / totalItems) * 100 : 0;

  // If too few results, suggest expanding
  if (matchedItems < 10 && currentConfig.conditions.length > 0) {
    // Suggest removing a filter
    const lastCondition = currentConfig.conditions[currentConfig.conditions.length - 1];
    if (lastCondition) {
      suggestions.push({
        id: 'expand-remove-last',
        type: 'expand',
        label: `Remove "${lastCondition.field}" filter`,
        description: 'See more results by removing the last filter',
        config: {
          ...currentConfig,
          conditions: currentConfig.conditions.slice(0, -1),
        },
        estimatedMatches: Math.min(totalItems, matchedItems * 3),
        confidence: 0.8,
        reasoning: 'Your current filters are very restrictive',
      });
    }

    // Suggest changing to OR
    if (currentConfig.rootCombinator === 'AND' && currentConfig.conditions.length > 1) {
      suggestions.push({
        id: 'expand-to-or',
        type: 'expand',
        label: 'Match ANY filter instead of ALL',
        description: 'Switch from AND to OR logic',
        config: {
          ...currentConfig,
          rootCombinator: 'OR',
        },
        estimatedMatches: Math.min(totalItems, matchedItems * 5),
        confidence: 0.7,
      });
    }
  }

  // If many results, suggest narrowing
  if (matchPercentage > 50 && matchedItems > 100) {
    // Suggest adding popular field filter
    for (const [field, dist] of Object.entries(fieldDistribution)) {
      if (dist.values.length > 1) {
        const topValue = dist.values[0];
        const fieldDef = fields.find((f) => f.field === field);

        if (topValue && topValue.percentage > 20 && topValue.percentage < 80) {
          suggestions.push({
            id: `narrow-${field}`,
            type: 'narrow',
            label: `Filter by ${fieldDef?.name || field}: ${topValue.value}`,
            description: `${topValue.count} items have this value`,
            config: {
              ...currentConfig,
              conditions: [
                ...currentConfig.conditions,
                {
                  id: `suggested-${field}`,
                  field,
                  operator: 'equals',
                  value: topValue.value,
                  valueType: fieldDef?.type || 'string',
                  enabled: true,
                },
              ],
            },
            estimatedMatches: topValue.count,
            confidence: 0.75,
          });
          break; // Only one narrow suggestion
        }
      }
    }
  }

  // Suggest alternatives based on distribution
  for (const [field, dist] of Object.entries(fieldDistribution)) {
    // If a field has extreme distribution, suggest filtering
    if (dist.values.length >= 2) {
      const secondValue = dist.values[1];
      const fieldDef = fields.find((f) => f.field === field);

      if (secondValue && secondValue.percentage >= 15) {
        const existingFilter = currentConfig.conditions.find(
          (c) => c.field === field
        );

        if (!existingFilter) {
          suggestions.push({
            id: `alt-${field}`,
            type: 'alternative',
            label: `Try filtering by ${fieldDef?.name || field}`,
            description: `${dist.values.length} unique values available`,
            config: {
              ...currentConfig,
              conditions: [
                ...currentConfig.conditions,
                {
                  id: `alt-${field}`,
                  field,
                  operator: 'equals',
                  value: secondValue.value,
                  valueType: fieldDef?.type || 'string',
                  enabled: true,
                },
              ],
            },
            estimatedMatches: secondValue.count,
            confidence: 0.6,
          });
        }
      }
    }
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions.slice(0, PERFORMANCE_THRESHOLDS.maxSuggestions);
}
