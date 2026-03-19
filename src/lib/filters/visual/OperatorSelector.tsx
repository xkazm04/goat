'use client';

/**
 * OperatorSelector
 * Field-type aware operator dropdown for filter conditions
 */

import React, { useMemo } from 'react';
import type { FilterOperator, FilterValueType } from '@/lib/filters/types';
import { OPERATOR_LABELS, TYPE_OPERATORS } from '@/lib/filters/constants';
import { cn } from '@/lib/utils';
import { UniversalSelect } from '@/components/ui/universal-select';

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

  // Build flat options with group labels for UniversalSelect
  const selectOptions = useMemo(() => {
    return groupedOperators.flatMap((group) =>
      group.operators.map((op) => ({
        value: op,
        label: OPERATOR_LABELS[op],
        icon: <span className="font-mono text-xs opacity-70">{OPERATOR_ICONS[op]}</span>,
        group: group.label,
      }))
    );
  }, [groupedOperators]);

  return (
    <div className={cn('min-w-[140px]', className)}>
      <UniversalSelect
        value={value}
        onChange={(val) => onChange(val as FilterOperator)}
        options={selectOptions}
        size="sm"
        searchable={false}
        placeholder="Operator..."
      />
    </div>
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
        'bg-muted text-muted-foreground border border-border',
        className
      )}
    >
      {OPERATOR_ICONS[operator] || '?'}
      <span className="hidden sm:inline">{OPERATOR_LABELS[operator]}</span>
    </span>
  );
}
