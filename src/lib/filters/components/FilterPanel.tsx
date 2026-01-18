'use client';

/**
 * FilterPanel
 * Expandable UI for filter configuration
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type {
  FilterCondition,
  FilterGroup,
  FilterConfig,
  FilterFieldDefinition,
  FilterOperator,
  FilterValue,
  FilterCombinator,
} from '../types';
import {
  OPERATOR_LABELS,
  TYPE_OPERATORS,
  FILTER_COLORS,
  COMBINATOR_LABELS,
  FILTER_ANIMATIONS,
  DEFAULT_FILTER_FIELDS,
} from '../constants';

/**
 * FilterPanel Props
 */
interface FilterPanelProps {
  config: FilterConfig;
  fields?: FilterFieldDefinition[];
  onChange: (config: FilterConfig) => void;
  onClear?: () => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showHeader?: boolean;
  maxConditions?: number;
}

/**
 * FilterPanel Component
 */
export function FilterPanel({
  config,
  fields = DEFAULT_FILTER_FIELDS,
  onChange,
  onClear,
  className,
  isExpanded: controlledExpanded,
  onToggleExpand,
  showHeader = true,
  maxConditions = 10,
}: FilterPanelProps) {
  const [localExpanded, setLocalExpanded] = useState(true);
  const isExpanded = controlledExpanded ?? localExpanded;

  const toggleExpand = useCallback(() => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded((prev) => !prev);
    }
  }, [onToggleExpand]);

  // Count active conditions
  const activeCount = useMemo(() => {
    let count = config.conditions.filter((c) => c.enabled).length;
    const countInGroup = (group: FilterGroup): number => {
      let total = group.conditions.filter((c) => c.enabled).length;
      for (const g of group.groups) {
        total += countInGroup(g);
      }
      return total;
    };
    for (const group of config.groups) {
      count += countInGroup(group);
    }
    return count;
  }, [config]);

  // Add new condition
  const handleAddCondition = useCallback(() => {
    if (config.conditions.length >= maxConditions) return;

    const defaultField = fields[0];
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: defaultField.field,
      operator: defaultField.defaultOperator,
      value: '',
      valueType: defaultField.type,
      enabled: true,
    };

    onChange({
      ...config,
      conditions: [...config.conditions, newCondition],
    });
  }, [config, fields, maxConditions, onChange]);

  // Update condition
  const handleUpdateCondition = useCallback(
    (id: string, updates: Partial<FilterCondition>) => {
      onChange({
        ...config,
        conditions: config.conditions.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      });
    },
    [config, onChange]
  );

  // Remove condition
  const handleRemoveCondition = useCallback(
    (id: string) => {
      onChange({
        ...config,
        conditions: config.conditions.filter((c) => c.id !== id),
      });
    },
    [config, onChange]
  );

  // Change root combinator
  const handleCombinatorChange = useCallback(
    (combinator: FilterCombinator) => {
      onChange({
        ...config,
        rootCombinator: combinator,
      });
    },
    [config, onChange]
  );

  return (
    <div
      className={cn(
        'border border-border rounded-lg bg-background overflow-hidden',
        className
      )}
    >
      {/* Header */}
      {showHeader && (
        <button
          className={cn(
            'w-full flex items-center justify-between px-4 py-3',
            'hover:bg-accent/50 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset'
          )}
          onClick={toggleExpand}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filters</span>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground"
          >
            ▼
          </motion.span>
        </button>
      )}

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
            <div className="p-4 pt-0 space-y-4">
              {/* Root Combinator */}
              {config.conditions.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Match items where:
                  </span>
                  <CombinatorToggle
                    value={config.rootCombinator}
                    onChange={handleCombinatorChange}
                  />
                </div>
              )}

              {/* Conditions */}
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {config.conditions.map((condition, index) => (
                    <motion.div
                      key={condition.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <FilterConditionRow
                        condition={condition}
                        fields={fields}
                        onUpdate={(updates) =>
                          handleUpdateCondition(condition.id, updates)
                        }
                        onRemove={() => handleRemoveCondition(condition.id)}
                        showCombinator={index > 0}
                        combinator={config.rootCombinator}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm',
                    'bg-accent hover:bg-accent/80 rounded-md transition-colors',
                    config.conditions.length >= maxConditions &&
                      'opacity-50 cursor-not-allowed'
                  )}
                  onClick={handleAddCondition}
                  disabled={config.conditions.length >= maxConditions}
                >
                  <span>+</span>
                  <span>Add Filter</span>
                </button>

                {activeCount > 0 && onClear && (
                  <button
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    onClick={onClear}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * CombinatorToggle Props
 */
interface CombinatorToggleProps {
  value: FilterCombinator;
  onChange: (value: FilterCombinator) => void;
  size?: 'sm' | 'md';
}

/**
 * CombinatorToggle Component
 */
function CombinatorToggle({
  value,
  onChange,
  size = 'sm',
}: CombinatorToggleProps) {
  return (
    <div className="inline-flex bg-muted rounded-md p-0.5">
      {(['AND', 'OR'] as const).map((combinator) => (
        <button
          key={combinator}
          className={cn(
            'relative px-2 py-1 rounded transition-colors',
            size === 'sm' ? 'text-xs' : 'text-sm',
            value === combinator
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onChange(combinator)}
          title={COMBINATOR_LABELS[combinator].description}
        >
          {value === combinator && (
            <motion.div
              className="absolute inset-0 bg-primary rounded"
              layoutId="combinator-indicator"
              transition={FILTER_ANIMATIONS.transition}
            />
          )}
          <span className="relative z-10">
            {COMBINATOR_LABELS[combinator].label}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * FilterConditionRow Props
 */
interface FilterConditionRowProps {
  condition: FilterCondition;
  fields: FilterFieldDefinition[];
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
  showCombinator?: boolean;
  combinator?: FilterCombinator;
}

/**
 * FilterConditionRow Component
 */
function FilterConditionRow({
  condition,
  fields,
  onUpdate,
  onRemove,
  showCombinator,
  combinator,
}: FilterConditionRowProps) {
  const field = fields.find((f) => f.field === condition.field) || fields[0];
  const colors = FILTER_COLORS[field.type];

  // Get available operators for current field
  const operators = TYPE_OPERATORS[field.type] || [];

  // Handle field change
  const handleFieldChange = (fieldId: string) => {
    const newField = fields.find((f) => f.id === fieldId);
    if (newField) {
      onUpdate({
        field: newField.field,
        valueType: newField.type,
        operator: newField.defaultOperator,
        value: '',
      });
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border transition-all',
        condition.enabled
          ? `${colors.bg} ${colors.border}`
          : 'bg-muted/30 border-muted opacity-60'
      )}
    >
      {/* Combinator label */}
      {showCombinator && (
        <span className="text-xs text-muted-foreground min-w-[32px]">
          {combinator}
        </span>
      )}

      {/* Enable toggle */}
      <button
        className={cn(
          'w-4 h-4 rounded border flex items-center justify-center transition-colors',
          condition.enabled
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-border hover:border-primary'
        )}
        onClick={() => onUpdate({ enabled: !condition.enabled })}
        title={condition.enabled ? 'Disable filter' : 'Enable filter'}
      >
        {condition.enabled && <span className="text-xs">✓</span>}
      </button>

      {/* Field selector */}
      <select
        className={cn(
          'flex-shrink-0 px-2 py-1 text-sm bg-transparent rounded',
          'border border-transparent hover:border-border focus:border-ring',
          'focus:outline-none cursor-pointer'
        )}
        value={field.id}
        onChange={(e) => handleFieldChange(e.target.value)}
      >
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.icon} {f.name}
          </option>
        ))}
      </select>

      {/* Operator selector */}
      <select
        className={cn(
          'flex-shrink-0 px-2 py-1 text-sm bg-transparent rounded',
          'border border-transparent hover:border-border focus:border-ring',
          'focus:outline-none cursor-pointer'
        )}
        value={condition.operator}
        onChange={(e) =>
          onUpdate({ operator: e.target.value as FilterOperator })
        }
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {/* Value input */}
      {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
        <FilterValueInput
          type={field.type}
          operator={condition.operator}
          value={condition.value}
          options={field.options}
          range={field.range}
          placeholder={field.placeholder}
          onChange={(value) => onUpdate({ value })}
        />
      )}

      {/* Remove button */}
      <button
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded flex items-center justify-center',
          'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
          'transition-colors'
        )}
        onClick={onRemove}
        title="Remove filter"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * FilterValueInput Props
 */
interface FilterValueInputProps {
  type: string;
  operator: FilterOperator;
  value: FilterValue;
  options?: { value: string | number; label: string }[];
  range?: { min: number; max: number };
  placeholder?: string;
  onChange: (value: FilterValue) => void;
}

/**
 * FilterValueInput Component
 */
function FilterValueInput({
  type,
  operator,
  value,
  options,
  range,
  placeholder,
  onChange,
}: FilterValueInputProps) {
  // Range input for 'between' operator
  if (operator === 'between') {
    const rangeValue = (value as { min: number; max: number }) || {
      min: range?.min || 0,
      max: range?.max || 100,
    };

    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          className={cn(
            'w-20 px-2 py-1 text-sm rounded',
            'bg-background border border-border',
            'focus:outline-none focus:ring-1 focus:ring-ring'
          )}
          value={rangeValue.min}
          min={range?.min}
          max={range?.max}
          onChange={(e) =>
            onChange({ ...rangeValue, min: Number(e.target.value) })
          }
        />
        <span className="text-xs text-muted-foreground">to</span>
        <input
          type="number"
          className={cn(
            'w-20 px-2 py-1 text-sm rounded',
            'bg-background border border-border',
            'focus:outline-none focus:ring-1 focus:ring-ring'
          )}
          value={rangeValue.max}
          min={range?.min}
          max={range?.max}
          onChange={(e) =>
            onChange({ ...rangeValue, max: Number(e.target.value) })
          }
        />
      </div>
    );
  }

  // Multi-select for 'in' and 'not_in' operators
  if (['in', 'not_in'].includes(operator) && options) {
    const selectedValues = (value as (string | number)[]) || [];

    return (
      <div className="flex flex-wrap gap-1 max-w-[200px]">
        {options.slice(0, 5).map((opt) => (
          <button
            key={opt.value}
            className={cn(
              'px-2 py-0.5 text-xs rounded border transition-colors',
              selectedValues.includes(opt.value)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:border-primary'
            )}
            onClick={() => {
              const newValues = selectedValues.includes(opt.value)
                ? selectedValues.filter((v) => v !== opt.value)
                : [...selectedValues, opt.value];
              onChange(newValues as FilterValue);
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  // Select for enum type with options
  if (type === 'enum' && options) {
    return (
      <select
        className={cn(
          'flex-1 min-w-[120px] px-2 py-1 text-sm rounded',
          'bg-background border border-border',
          'focus:outline-none focus:ring-1 focus:ring-ring'
        )}
        value={String(value || '')}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  // Boolean toggle
  if (type === 'boolean') {
    return (
      <select
        className={cn(
          'w-20 px-2 py-1 text-sm rounded',
          'bg-background border border-border',
          'focus:outline-none focus:ring-1 focus:ring-ring'
        )}
        value={String(value)}
        onChange={(e) => onChange(e.target.value === 'true')}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  // Number input
  if (type === 'number') {
    return (
      <input
        type="number"
        className={cn(
          'flex-1 min-w-[80px] px-2 py-1 text-sm rounded',
          'bg-background border border-border',
          'focus:outline-none focus:ring-1 focus:ring-ring'
        )}
        value={value as number}
        min={range?.min}
        max={range?.max}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }

  // Date input
  if (type === 'date') {
    return (
      <input
        type="date"
        className={cn(
          'flex-1 min-w-[140px] px-2 py-1 text-sm rounded',
          'bg-background border border-border',
          'focus:outline-none focus:ring-1 focus:ring-ring'
        )}
        value={value ? new Date(value as string).toISOString().split('T')[0] : ''}
        onChange={(e) => onChange(new Date(e.target.value))}
      />
    );
  }

  // Default text input
  return (
    <input
      type="text"
      className={cn(
        'flex-1 min-w-[120px] px-2 py-1 text-sm rounded',
        'bg-background border border-border',
        'focus:outline-none focus:ring-1 focus:ring-ring'
      )}
      value={String(value || '')}
      placeholder={placeholder || 'Enter value...'}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * Compact Filter Pill - for showing active filters inline
 */
interface FilterPillProps {
  condition: FilterCondition;
  field: FilterFieldDefinition;
  onRemove: () => void;
  onToggle: () => void;
}

export function FilterPill({
  condition,
  field,
  onRemove,
  onToggle,
}: FilterPillProps) {
  const colors = FILTER_COLORS[field.type];

  const getDisplayValue = () => {
    if (['is_empty', 'is_not_empty'].includes(condition.operator)) {
      return '';
    }
    if (typeof condition.value === 'object' && condition.value !== null) {
      if ('min' in condition.value && 'max' in condition.value) {
        return `${condition.value.min} - ${condition.value.max}`;
      }
      return JSON.stringify(condition.value);
    }
    return String(condition.value);
  };

  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs',
        'border transition-all cursor-pointer',
        condition.enabled
          ? `${colors.bg} ${colors.border} ${colors.text}`
          : 'bg-muted/50 border-muted text-muted-foreground'
      )}
      onClick={onToggle}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {field.icon && <span>{field.icon}</span>}
      <span className="font-medium">{field.name}</span>
      <span className="opacity-70">{OPERATOR_LABELS[condition.operator]}</span>
      {getDisplayValue() && (
        <span className="font-semibold">{getDisplayValue()}</span>
      )}
      <button
        className="ml-1 hover:text-destructive transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ✕
      </button>
    </motion.div>
  );
}
