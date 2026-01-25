'use client';

/**
 * ValueInput
 * Dynamic value input component that adapts to filter value type and operator
 */

import React, { useCallback, useMemo } from 'react';
import type { FilterOperator, FilterValueType, FilterValue } from '@/lib/filters/types';
import { DEFAULT_FILTER_FIELDS } from '@/lib/filters/constants';
import { cn } from '@/lib/utils';

interface ValueInputProps {
  value: FilterValue;
  valueType: FilterValueType;
  operator: FilterOperator;
  field: string;
  onChange: (value: FilterValue) => void;
  className?: string;
}

/**
 * Get field options if it's an enum type
 */
function getFieldOptions(field: string) {
  const fieldDef = DEFAULT_FILTER_FIELDS.find((f) => f.field === field);
  return fieldDef?.options || [];
}

export function ValueInput({
  value,
  valueType,
  operator,
  field,
  onChange,
  className,
}: ValueInputProps) {
  const fieldOptions = useMemo(() => getFieldOptions(field), [field]);

  // Handle basic string/number input
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (valueType === 'number') {
        onChange(newValue === '' ? '' : Number(newValue));
      } else {
        onChange(newValue);
      }
    },
    [valueType, onChange]
  );

  // Handle boolean input
  const handleBooleanChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value === 'true');
    },
    [onChange]
  );

  // Handle select input for enums
  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // Handle multi-select for 'in' and 'not_in' operators
  const handleMultiSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
      onChange(selectedOptions);
    },
    [onChange]
  );

  // Handle 'between' operator with min/max
  const handleBetweenChange = useCallback(
    (type: 'min' | 'max', newVal: string) => {
      const currentValue = (value as { min: number; max: number }) || { min: 0, max: 100 };
      const numValue = newVal === '' ? 0 : Number(newVal);
      onChange({
        ...currentValue,
        [type]: numValue,
      });
    },
    [value, onChange]
  );

  // Handle tags/array input (comma-separated)
  const handleTagsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
      onChange(tags);
    },
    [onChange]
  );

  // Handle date input
  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value ? new Date(e.target.value) : null);
    },
    [onChange]
  );

  const baseInputClass = cn(
    'rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm',
    'text-zinc-200 placeholder-zinc-500',
    'focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500',
    'min-w-[100px] flex-1',
    className
  );

  // Render 'between' input (two number fields)
  if (operator === 'between') {
    const betweenValue = (value as { min: number; max: number }) || { min: 0, max: 100 };
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={betweenValue.min}
          onChange={(e) => handleBetweenChange('min', e.target.value)}
          placeholder="Min"
          className={cn(baseInputClass, 'w-20')}
        />
        <span className="text-zinc-500">to</span>
        <input
          type="number"
          value={betweenValue.max}
          onChange={(e) => handleBetweenChange('max', e.target.value)}
          placeholder="Max"
          className={cn(baseInputClass, 'w-20')}
        />
      </div>
    );
  }

  // Render 'in' / 'not_in' input
  if (operator === 'in' || operator === 'not_in') {
    // If we have field options, show multi-select
    if (fieldOptions.length > 0) {
      const arrayValue = Array.isArray(value) ? value : [];
      return (
        <select
          multiple
          value={arrayValue.map(String)}
          onChange={handleMultiSelectChange}
          className={cn(baseInputClass, 'min-h-[60px]')}
        >
          {fieldOptions.map((opt) => (
            <option key={opt.value} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    // Otherwise, comma-separated input
    const arrayValue = Array.isArray(value) ? value.join(', ') : '';
    return (
      <input
        type="text"
        value={arrayValue}
        onChange={handleTagsChange}
        placeholder="value1, value2, ..."
        className={baseInputClass}
      />
    );
  }

  // Render based on value type
  switch (valueType) {
    case 'boolean':
      return (
        <select
          value={String(value)}
          onChange={handleBooleanChange}
          className={baseInputClass}
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );

    case 'number':
      return (
        <input
          type="number"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={handleTextChange}
          placeholder="Enter number..."
          className={baseInputClass}
        />
      );

    case 'date':
      const dateValue = value instanceof Date
        ? value.toISOString().split('T')[0]
        : typeof value === 'string'
        ? value
        : '';
      return (
        <input
          type="date"
          value={dateValue}
          onChange={handleDateChange}
          className={baseInputClass}
        />
      );

    case 'enum':
      if (fieldOptions.length > 0) {
        return (
          <select
            value={String(value || '')}
            onChange={handleSelectChange}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {fieldOptions.map((opt) => (
              <option key={opt.value} value={String(opt.value)}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        );
      }
      // Fall through to string if no options
      return (
        <input
          type="text"
          value={String(value || '')}
          onChange={handleTextChange}
          placeholder="Enter value..."
          className={baseInputClass}
        />
      );

    case 'array':
      // For array fields like tags
      const tagsValue = Array.isArray(value) ? value.join(', ') : String(value || '');
      return (
        <input
          type="text"
          value={tagsValue}
          onChange={handleTagsChange}
          placeholder="tag1, tag2, ..."
          className={baseInputClass}
        />
      );

    case 'string':
    default:
      return (
        <input
          type="text"
          value={String(value || '')}
          onChange={handleTextChange}
          placeholder="Enter text..."
          className={baseInputClass}
        />
      );
  }
}

/**
 * Compact value display for previews
 */
export function ValueDisplay({
  value,
  valueType,
  className,
}: {
  value: FilterValue;
  valueType: FilterValueType;
  className?: string;
}) {
  const displayValue = useMemo(() => {
    if (value === null || value === undefined || value === '') return 'empty';

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'empty array';
    }

    if (typeof value === 'object' && 'min' in value && 'max' in value) {
      return `${value.min} - ${value.max}`;
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    return String(value);
  }, [value]);

  return (
    <span
      className={cn(
        'truncate text-sm text-zinc-300',
        className
      )}
    >
      {displayValue}
    </span>
  );
}
