'use client';

/**
 * FilterPresetManager
 * Save/load filter combinations
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { FilterPreset, FilterConfig } from '../types';
import {
  PRESET_ICONS,
  PRESET_COLORS,
  FILTER_ANIMATIONS,
  EMPTY_FILTER_CONFIG,
} from '../constants';

/**
 * FilterPresetManager Props
 */
interface FilterPresetManagerProps {
  presets: FilterPreset[];
  activePresetId: string | null;
  currentConfig: FilterConfig;
  onLoadPreset: (preset: FilterPreset) => void;
  onSavePreset: (name: string, description?: string, icon?: string, color?: string) => void;
  onDeletePreset: (presetId: string) => void;
  onUpdatePreset: (presetId: string, updates: Partial<FilterPreset>) => void;
  className?: string;
}

/**
 * FilterPresetManager Component
 */
export function FilterPresetManager({
  presets,
  activePresetId,
  currentConfig,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  onUpdatePreset,
  className,
}: FilterPresetManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<FilterPreset | null>(null);

  // Sort presets by usage and recent
  const sortedPresets = useMemo(() => {
    return [...presets].sort((a, b) => {
      // Default presets first
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      // Then by usage count
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      // Then by date
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [presets]);

  // Check if current config has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!activePresetId) return currentConfig.conditions.length > 0;
    const activePreset = presets.find((p) => p.id === activePresetId);
    if (!activePreset) return true;
    return JSON.stringify(activePreset.config) !== JSON.stringify(currentConfig);
  }, [activePresetId, currentConfig, presets]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Filter Presets
        </h4>
        <button
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs',
            'bg-accent hover:bg-accent/80 rounded transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          onClick={() => setShowSaveDialog(true)}
          disabled={currentConfig.conditions.length === 0}
        >
          <span>💾</span>
          <span>Save Current</span>
        </button>
      </div>

      {/* Preset List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedPresets.map((preset, index) => (
            <motion.div
              key={preset.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: index * 0.03 }}
            >
              <PresetCard
                preset={preset}
                isActive={preset.id === activePresetId}
                onLoad={() => onLoadPreset(preset)}
                onEdit={() => setEditingPreset(preset)}
                onDelete={() => onDeletePreset(preset.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {sortedPresets.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No saved presets yet.
            <br />
            Create filters and save them for quick access.
          </div>
        )}
      </div>

      {/* Unsaved changes indicator */}
      {hasUnsavedChanges && activePresetId && (
        <div className="flex items-center gap-2 text-xs text-amber-500">
          <span>⚠️</span>
          <span>You have unsaved changes</span>
          <button
            className="underline hover:no-underline"
            onClick={() => {
              const preset = presets.find((p) => p.id === activePresetId);
              if (preset) {
                onUpdatePreset(preset.id, { config: currentConfig });
              }
            }}
          >
            Update preset
          </button>
        </div>
      )}

      {/* Save Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <SavePresetDialog
            onSave={(name, description, icon, color) => {
              onSavePreset(name, description, icon, color);
              setShowSaveDialog(false);
            }}
            onCancel={() => setShowSaveDialog(false)}
          />
        )}
      </AnimatePresence>

      {/* Edit Dialog */}
      <AnimatePresence>
        {editingPreset && (
          <EditPresetDialog
            preset={editingPreset}
            onSave={(updates) => {
              onUpdatePreset(editingPreset.id, updates);
              setEditingPreset(null);
            }}
            onCancel={() => setEditingPreset(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * PresetCard Props
 */
interface PresetCardProps {
  preset: FilterPreset;
  isActive: boolean;
  onLoad: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * PresetCard Component
 */
function PresetCard({
  preset,
  isActive,
  onLoad,
  onEdit,
  onDelete,
}: PresetCardProps) {
  const [showActions, setShowActions] = useState(false);

  const conditionCount = useMemo(() => {
    let count = preset.config.conditions.length;
    const countInGroup = (conditions: typeof preset.config.conditions, groups: typeof preset.config.groups): number => {
      let total = conditions.length;
      for (const g of groups) {
        total += countInGroup(g.conditions, g.groups);
      }
      return total;
    };
    count = countInGroup(preset.config.conditions, preset.config.groups);
    return count;
  }, [preset.config]);

  return (
    <motion.div
      className={cn(
        'relative flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
        isActive
          ? 'bg-primary/10 border-primary ring-1 ring-primary'
          : 'bg-background border-border hover:border-border/80 hover:bg-accent/30'
      )}
      onClick={onLoad}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-lg"
        style={{ backgroundColor: preset.color ? `${preset.color}20` : undefined }}
      >
        {preset.icon || '🎯'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{preset.name}</span>
          {preset.isDefault && (
            <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded">
              Default
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{conditionCount} filter{conditionCount !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>Used {preset.usageCount}x</span>
        </div>
      </div>

      {/* Actions */}
      <AnimatePresence>
        {showActions && !preset.isDefault && (
          <motion.div
            className="absolute right-2 flex items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="p-1.5 rounded hover:bg-accent transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit preset"
            >
              ✏️
            </button>
            <button
              className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete preset"
            >
              🗑️
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute -left-px top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r"
          layoutId="active-preset-indicator"
        />
      )}
    </motion.div>
  );
}

/**
 * SavePresetDialog Props
 */
interface SavePresetDialogProps {
  onSave: (name: string, description?: string, icon?: string, color?: string) => void;
  onCancel: () => void;
}

/**
 * SavePresetDialog Component
 */
function SavePresetDialog({ onSave, onCancel }: SavePresetDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(PRESET_ICONS[0]);
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim() || undefined, icon, color);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-md bg-background border border-border rounded-xl shadow-xl p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={FILTER_ANIMATIONS.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Save Filter Preset</h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border',
                'bg-background focus:outline-none focus:ring-2 focus:ring-ring'
              )}
              placeholder="My Filter Preset"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <textarea
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border resize-none',
                'bg-background focus:outline-none focus:ring-2 focus:ring-ring'
              )}
              placeholder="Describe what this preset filters..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((i) => (
                <button
                  key={i}
                  className={cn(
                    'w-8 h-8 rounded-lg border transition-all',
                    icon === i
                      ? 'border-primary bg-primary/10 scale-110'
                      : 'border-border hover:border-primary/50'
                  )}
                  onClick={() => setIcon(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    color === c ? 'border-foreground scale-125' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={cn(
              'px-4 py-2 text-sm rounded-lg transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save Preset
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * EditPresetDialog Props
 */
interface EditPresetDialogProps {
  preset: FilterPreset;
  onSave: (updates: Partial<FilterPreset>) => void;
  onCancel: () => void;
}

/**
 * EditPresetDialog Component
 */
function EditPresetDialog({ preset, onSave, onCancel }: EditPresetDialogProps) {
  const [name, setName] = useState(preset.name);
  const [description, setDescription] = useState(preset.description || '');
  const [icon, setIcon] = useState(preset.icon || PRESET_ICONS[0]);
  const [color, setColor] = useState(preset.color || PRESET_COLORS[0]);

  const handleSave = () => {
    if (name.trim()) {
      onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        updatedAt: new Date(),
      });
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-md bg-background border border-border rounded-xl shadow-xl p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={FILTER_ANIMATIONS.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Edit Preset</h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border',
                'bg-background focus:outline-none focus:ring-2 focus:ring-ring'
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border resize-none',
                'bg-background focus:outline-none focus:ring-2 focus:ring-ring'
              )}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((i) => (
                <button
                  key={i}
                  className={cn(
                    'w-8 h-8 rounded-lg border transition-all',
                    icon === i
                      ? 'border-primary bg-primary/10 scale-110'
                      : 'border-border hover:border-primary/50'
                  )}
                  onClick={() => setIcon(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    color === c ? 'border-foreground scale-125' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={cn(
              'px-4 py-2 text-sm rounded-lg transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * PresetQuickAccess - Compact preset selector
 */
interface PresetQuickAccessProps {
  presets: FilterPreset[];
  activePresetId: string | null;
  onSelect: (preset: FilterPreset) => void;
  maxVisible?: number;
  className?: string;
}

export function PresetQuickAccess({
  presets,
  activePresetId,
  onSelect,
  maxVisible = 5,
  className,
}: PresetQuickAccessProps) {
  const visiblePresets = presets.slice(0, maxVisible);
  const hasMore = presets.length > maxVisible;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {visiblePresets.map((preset) => (
        <motion.button
          key={preset.id}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md text-xs',
            'border transition-all',
            preset.id === activePresetId
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-background border-border hover:border-primary/50'
          )}
          onClick={() => onSelect(preset)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={preset.description}
        >
          <span>{preset.icon}</span>
          <span className="hidden sm:inline">{preset.name}</span>
        </motion.button>
      ))}
      {hasMore && (
        <span className="text-xs text-muted-foreground">
          +{presets.length - maxVisible}
        </span>
      )}
    </div>
  );
}
