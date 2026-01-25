'use client';

/**
 * OperatorSelector
 * Field-type aware operator dropdown for filter conditions
 */

import React, { useMemo } from 'react';
import type { FilterOperator, FilterValueType } from '@/lib/filters/types';
import { OPERATOR_LABELS, TYPE_OPERATORS } from '@/lib/filters/constants';
import { cn } from '@/lib/utils';

interface OperatorSelectorProps {
  valueType: FilterValueType;
  value: FilterOperator;
  onChange: (operator: FilterOperator) => void;
  className?: string;
}

/**
 * Operator icons for visual feedback
 */
const OPERATOR_ICONS: Partial<Record<FilterOperator, string>> = {
  equals: '=',
  not_equals: '!=',
  contains: '*',
  not_contains: '!*',
  starts_with: '^',
  ends_with: '$',
  greater_than: '>',
  less_than: '<',
  greater_equal: '>=',
  less_equal: '<=',
  between: '<>',
  in: '[]',
  not_in: '![]',
  is_empty: 'null',
  is_not_empty: '!null',
  matches_regex: '/./',
};

/**
 * Group operators by category for better UX
 */
const OPERATOR_GROUPS: Record<string, FilterOperator[]> = {
  equality: ['equals', 'not_equals'],
  text: ['contains', 'not_contains', 'starts_with', 'ends_with', 'matches_regex'],
  comparison: ['greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
  inclusion: ['in', 'not_in'],
  nullness: ['is_empty', 'is_not_empty'],
};

export function OperatorSelector({
  valueType,
  value,
  onChange,
  className,
}: OperatorSelectorProps) {
  // Get available operators for this value type
  const availableOperators = useMemo(() => {
    return TYPE_OPERATORS[valueType] || TYPE_OPERATORS.string;
  }, [valueType]);

  // Group available operators
  const groupedOperators = useMemo(() => {
    const groups: Array<{ label: string; operators: FilterOperator[] }> = [];

    for (const [groupName, ops] of Object.entries(OPERATOR_GROUPS)) {
      const availableInGroup = ops.filter((op) => availableOperators.includes(op));
      if (availableInGroup.length > 0) {
        groups.push({
          label: groupName.charAt(0).toUpperCase() + groupName.slice(1),
          operators: availableInGroup,
        });
      }
    }

    return groups;
  }, [availableOperators]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FilterOperator)}
      className={cn(
        'rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm',
        'text-zinc-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500',
        'min-w-[120px]',
        className
      )}
    >
      {groupedOperators.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.operators.map((op) => (
            <option key={op} value={op}>
              {OPERATOR_ICONS[op]} {OPERATOR_LABELS[op]}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * Compact operator badge display
 */
export function OperatorBadge({
  operator,
  className,
}: {
  operator: FilterOperator;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono',
        'bg-zinc-800 text-zinc-400 border border-zinc-700',
        className
      )}
    >
      {OPERATOR_ICONS[operator] || '?'}
      <span className="hidden sm:inline">{OPERATOR_LABELS[operator]}</span>
    </span>
  );
}
