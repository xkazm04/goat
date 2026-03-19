'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Circle,
  Minus,
  Type,
  EyeOff,
  Plus,
  Trash2,
} from 'lucide-react';
import { memo, useCallback } from 'react';

import { SURFACE_ELEVATION } from '@/components/visual/depth/depth-tokens';
import { cn } from '@/lib/utils';

import type {
  Criterion,
  CriterionDisplayType,
  CriterionDisplayPosition,
  CriterionDisplayConfig,
} from '@/lib/criteria/types';

export interface CriteriaDisplayConfiguratorProps {
  /** List of criteria to configure */
  criteria: Criterion[];
  /** Callback when criteria are updated */
  onCriteriaChange: (criteria: Criterion[]) => void;
  /** Color palette for criteria */
  colors: string[];
  /** Whether to allow adding new criteria */
  allowAdd?: boolean;
  /** Maximum number of criteria allowed */
  maxCriteria?: number;
  /** Read-only mode (for presets) - disables name editing and remove */
  readOnly?: boolean;
}

// Display type options
const DISPLAY_TYPES: { type: CriterionDisplayType; icon: typeof Circle; label: string }[] = [
  { type: 'ring-3', icon: Circle, label: 'Ring' },
  { type: 'bar', icon: Minus, label: 'Bar' },
  { type: 'label', icon: Type, label: 'Label' },
  { type: 'hidden', icon: EyeOff, label: 'Hidden' },
];

// Position options (excluding top-right which is reserved for remove button)
const POSITION_OPTIONS: { value: CriterionDisplayPosition; label: string }[] = [
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'top-center', label: 'Top Center' },
];

/**
 * CriteriaDisplayConfigurator
 *
 * Configuration UI for criteria display settings.
 * Features:
 * - Display type selector (ring/bar/label/hidden icons)
 * - Position dropdown
 * - Inline weight adjuster (+/-)
 * - Add/remove criteria
 */
export const CriteriaDisplayConfigurator = memo(function CriteriaDisplayConfigurator({
  criteria,
  onCriteriaChange,
  colors,
  allowAdd = true,
  maxCriteria = 8,
  readOnly = false,
}: CriteriaDisplayConfiguratorProps) {
  const updateCriterion = useCallback(
    (id: string, updates: Partial<Criterion>) => {
      const updated = criteria.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      onCriteriaChange(updated);
    },
    [criteria, onCriteriaChange]
  );

  const updateDisplayConfig = useCallback(
    (id: string, configUpdates: Partial<CriterionDisplayConfig>) => {
      const updated = criteria.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          displayConfig: {
            displayType: c.displayConfig?.displayType ?? 'ring-3',
            ...c.displayConfig,
            ...configUpdates,
          },
        };
      });
      onCriteriaChange(updated);
    },
    [criteria, onCriteriaChange]
  );

  const addCriterion = useCallback(() => {
    if (criteria.length >= maxCriteria) return;
    const newCriterion: Criterion = {
      id: `criterion-${Date.now()}`,
      name: 'New Criterion',
      description: 'Description',
      weight: Math.floor(100 / (criteria.length + 1)),
      minScore: 1,
      maxScore: 10,
      displayConfig: {
        displayType: 'ring-3',
      },
    };
    onCriteriaChange([...criteria, newCriterion]);
  }, [criteria, maxCriteria, onCriteriaChange]);

  const removeCriterion = useCallback(
    (id: string) => {
      if (criteria.length <= 1) return;
      onCriteriaChange(criteria.filter((c) => c.id !== id));
    },
    [criteria, onCriteriaChange]
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-400">Display Configuration</h4>
        {allowAdd && !readOnly && (
          <button
            onClick={addCriterion}
            disabled={criteria.length >= maxCriteria}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
              criteria.length >= maxCriteria
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Criteria List - Compact single-row design */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {criteria.map((criterion, idx) => {
            const color = colors[idx] || criterion.color || '#f59e0b';
            const displayType = criterion.displayConfig?.displayType ?? 'ring-3';

            return (
              <motion.div
                key={criterion.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-800/50"
                style={{ backgroundColor: SURFACE_ELEVATION.sunken, borderLeftColor: color, borderLeftWidth: 3 }}
              >
                {/* Color dot + Name */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {readOnly ? (
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {criterion.name}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={criterion.name}
                      onChange={(e) => updateCriterion(criterion.id, { name: e.target.value })}
                      className="flex-1 min-w-0 bg-transparent text-sm font-medium text-gray-200 focus:text-white focus:outline-hidden"
                      placeholder="Criterion name"
                    />
                  )}
                </div>

                {/* Display Type Icons */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-md" style={{ backgroundColor: SURFACE_ELEVATION.raised }}>
                  {DISPLAY_TYPES.map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() =>
                        updateDisplayConfig(criterion.id, { displayType: type })
                      }
                      className={cn(
                        'p-1.5 rounded transition-all',
                        displayType === type
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-500 hover:text-gray-300'
                      )}
                      title={label}
                    >
                      <Icon className="w-3 h-3" />
                    </button>
                  ))}
                </div>

                {/* Position Selector (only when not hidden) */}
                {displayType !== 'hidden' && (
                  <select
                    value={criterion.displayConfig?.position ?? ''}
                    onChange={(e) =>
                      updateDisplayConfig(criterion.id, {
                        position: (e.target.value || undefined) as CriterionDisplayPosition | undefined,
                      })
                    }
                    className="text-xs border border-gray-700/50 rounded px-2 py-1 text-gray-300 focus:outline-hidden focus:border-gray-600"
                    style={{ backgroundColor: SURFACE_ELEVATION.raised }}
                  >
                    <option value="">Auto</option>
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Hidden indicator */}
                {displayType === 'hidden' && (
                  <span className="text-xs text-gray-500 italic shrink-0">
                    Detail only
                  </span>
                )}

                {/* Remove Button (only in edit mode) */}
                {!readOnly && criteria.length > 1 && (
                  <button
                    onClick={() => removeCriterion(criterion.id)}
                    className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {criteria.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">No criteria configured</p>
          {allowAdd && !readOnly && (
            <button
              onClick={addCriterion}
              className="mt-2 text-xs text-amber-400 hover:text-amber-300"
            >
              Add your first criterion
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default CriteriaDisplayConfigurator;
