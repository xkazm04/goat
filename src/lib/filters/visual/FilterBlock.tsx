'use client';

/**
 * FilterBlock
 * Draggable filter condition component for the visual filter builder
 */

import React, { useCallback, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, X, ToggleLeft, ToggleRight } from 'lucide-react';
import type { FilterCondition, FilterValueType, FilterOperator } from '@/lib/filters/types';
import { FILTER_COLORS, OPERATOR_LABELS, TYPE_OPERATORS, DEFAULT_FILTER_FIELDS } from '@/lib/filters/constants';
import { cn } from '@/lib/utils';
import { useFilterBuilderStore } from '@/stores/filter-builder-store';
import { OperatorSelector } from './OperatorSelector';
import { ValueInput } from './ValueInput';

interface FilterBlockProps {
  nodeId: string;
  condition: FilterCondition;
  isSelected?: boolean;
  isDragging?: boolean;
  depth?: number;
}

/**
 * Get field definition by field name
 */
function getFieldDefinition(field: string) {
  return DEFAULT_FILTER_FIELDS.find((f) => f.field === field) || DEFAULT_FILTER_FIELDS[0];
}

/**
 * FilterBlock component
 */
export function FilterBlock({
  nodeId,
  condition,
  isSelected = false,
  isDragging = false,
  depth = 0,
}: FilterBlockProps) {
  const {
    updateCondition,
    removeNode,
    toggleNodeEnabled,
    setSelectedNode,
  } = useFilterBuilderStore();

  const fieldDef = useMemo(() => getFieldDefinition(condition.field), [condition.field]);
  const colors = FILTER_COLORS[condition.valueType] || FILTER_COLORS.string;

  // Draggable setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingLocal,
  } = useDraggable({
    id: nodeId,
    data: {
      type: 'condition',
      nodeId,
      condition,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDraggingLocal ? 0.5 : 1,
  };

  // Handlers
  const handleFieldChange = useCallback(
    (field: string) => {
      const newFieldDef = getFieldDefinition(field);
      const newOperators = TYPE_OPERATORS[newFieldDef.type];
      const newOperator = newOperators.includes(condition.operator)
        ? condition.operator
        : newFieldDef.defaultOperator;

      updateCondition(nodeId, {
        field,
        valueType: newFieldDef.type,
        operator: newOperator,
        value: '', // Reset value on field change
      });
    },
    [nodeId, condition.operator, updateCondition]
  );

  const handleOperatorChange = useCallback(
    (operator: FilterOperator) => {
      updateCondition(nodeId, { operator });
    },
    [nodeId, updateCondition]
  );

  const handleValueChange = useCallback(
    (value: FilterCondition['value']) => {
      updateCondition(nodeId, { value });
    },
    [nodeId, updateCondition]
  );

  const handleRemove = useCallback(() => {
    removeNode(nodeId);
  }, [nodeId, removeNode]);

  const handleToggleEnabled = useCallback(() => {
    toggleNodeEnabled(nodeId);
  }, [nodeId, toggleNodeEnabled]);

  const handleSelect = useCallback(() => {
    setSelectedNode(isSelected ? null : nodeId);
  }, [nodeId, isSelected, setSelectedNode]);

  // Check if operator needs a value input
  const needsValueInput = !['is_empty', 'is_not_empty'].includes(condition.operator);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{
        opacity: condition.enabled ? 1 : 0.5,
        y: 0,
        scale: 1,
      }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'group relative flex items-center gap-2 rounded-lg border p-3',
        'bg-zinc-900/50 backdrop-blur-sm',
        'transition-all duration-200',
        colors.border,
        isSelected && 'ring-2 ring-cyan-500/50',
        isDragging && 'shadow-lg shadow-cyan-500/20',
        !condition.enabled && 'opacity-50'
      )}
      onClick={handleSelect}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'flex cursor-grab items-center justify-center rounded p-1',
          'text-zinc-500 hover:text-zinc-300',
          'active:cursor-grabbing'
        )}
      >
        <GripVertical size={16} />
      </div>

      {/* Field selector */}
      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className={cn(
          'rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm',
          'text-zinc-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500',
          'min-w-[100px]'
        )}
      >
        {DEFAULT_FILTER_FIELDS.map((f) => (
          <option key={f.field} value={f.field}>
            {f.icon} {f.name}
          </option>
        ))}
      </select>

      {/* Operator selector */}
      <OperatorSelector
        valueType={condition.valueType}
        value={condition.operator}
        onChange={handleOperatorChange}
      />

      {/* Value input */}
      <AnimatePresence mode="wait">
        {needsValueInput && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1"
          >
            <ValueInput
              value={condition.value}
              valueType={condition.valueType}
              operator={condition.operator}
              field={condition.field}
              onChange={handleValueChange}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Type badge */}
      <div
        className={cn(
          'hidden items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium sm:flex',
          colors.bg,
          colors.text
        )}
      >
        {fieldDef.icon} {condition.valueType}
      </div>

      {/* Toggle enabled */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggleEnabled();
        }}
        className={cn(
          'rounded p-1 transition-colors',
          condition.enabled
            ? 'text-emerald-500 hover:text-emerald-400'
            : 'text-zinc-500 hover:text-zinc-400'
        )}
        title={condition.enabled ? 'Disable condition' : 'Enable condition'}
      >
        {condition.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
      </button>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
        className={cn(
          'rounded p-1 text-zinc-500 transition-colors',
          'hover:bg-red-500/20 hover:text-red-400'
        )}
        title="Remove condition"
      >
        <X size={16} />
      </button>

      {/* Depth indicator */}
      {depth > 0 && (
        <div
          className="absolute -left-3 top-1/2 h-px w-3 bg-zinc-600"
          style={{ transform: 'translateY(-50%)' }}
        />
      )}
    </motion.div>
  );
}

/**
 * FilterBlockOverlay - Used during drag operations
 */
export function FilterBlockOverlay({ condition }: { condition: FilterCondition }) {
  const fieldDef = getFieldDefinition(condition.field);
  const colors = FILTER_COLORS[condition.valueType] || FILTER_COLORS.string;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border p-3',
        'bg-zinc-900/90 backdrop-blur-sm shadow-lg shadow-cyan-500/30',
        colors.border,
        'ring-2 ring-cyan-500'
      )}
    >
      <GripVertical size={16} className="text-cyan-400" />
      <span className="text-sm text-zinc-300">
        {fieldDef.icon} {fieldDef.name}
      </span>
      <span className="text-xs text-zinc-500">
        {OPERATOR_LABELS[condition.operator]}
      </span>
      {condition.value !== null && condition.value !== '' && (
        <span className="truncate text-sm text-zinc-400">
          {String(condition.value)}
        </span>
      )}
    </div>
  );
}
