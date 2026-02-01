"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Palette,
  Check,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useRankingStore } from '@/stores/ranking-store';
import type { TierDefinition, TierColor } from '@/types/ranking';
import {
  TIER_COLOR_PALETTES,
  createTierColor,
  SYSTEM_TIER_PRESETS,
  type CustomTierPreset,
} from '@/lib/tier/customPresets';

interface TierConfigEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset?: (preset: CustomTierPreset) => void;
}

interface EditableTier extends TierDefinition {
  isNew?: boolean;
}

/**
 * Color picker popover for tier customization
 */
function ColorPicker({
  color,
  onChange,
  onClose,
}: {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}) {
  const [customColor, setCustomColor] = useState(color);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute top-full left-0 mt-2 p-3 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-50"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Preset palettes */}
      <div className="space-y-2 mb-3">
        <span className="text-xs text-slate-400 font-medium">Presets</span>
        <div className="grid grid-cols-6 gap-1.5">
          {Object.values(TIER_COLOR_PALETTES).flat().slice(0, 18).map((c, i) => (
            <button
              key={`${c}-${i}`}
              onClick={() => {
                onChange(c);
                onClose();
              }}
              className={`
                w-6 h-6 rounded-md border-2 transition-all
                ${c === color ? 'border-white scale-110' : 'border-transparent hover:border-slate-500'}
              `}
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
        <span className="text-xs text-slate-400">Custom:</span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="color"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="w-full h-8 rounded border border-slate-600 cursor-pointer"
            style={{ backgroundColor: customColor }}
            onClick={() => inputRef.current?.click()}
          />
        </div>
        <button
          onClick={() => {
            onChange(customColor);
            onClose();
          }}
          className="p-1.5 bg-cyan-500 hover:bg-cyan-400 rounded text-white transition-colors"
          aria-label="Apply custom color"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Single tier row in the editor
 */
function TierEditorRow({
  tier,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  tier: EditableTier;
  index: number;
  onUpdate: (updates: Partial<TierDefinition>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [labelValue, setLabelValue] = useState(tier.displayName);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  const handleLabelSave = () => {
    const trimmed = labelValue.trim();
    if (trimmed && trimmed.length <= 20) {
      onUpdate({ displayName: trimmed });
    } else {
      setLabelValue(tier.displayName);
    }
    setIsEditingLabel(false);
  };

  const handleColorChange = (newColor: string) => {
    const tierColor = createTierColor(newColor);
    onUpdate({ color: tierColor });
  };

  return (
    <Reorder.Item
      value={tier}
      id={tier.id}
      className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 group"
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors">
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Tier color indicator */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-inner transition-all hover:scale-105"
          style={{
            background: tier.color.gradient,
            color: tier.color.text,
          }}
          aria-label="Change tier color"
        >
          {tier.label}
        </button>
        <AnimatePresence>
          {showColorPicker && (
            <ColorPicker
              color={tier.color.primary}
              onChange={handleColorChange}
              onClose={() => setShowColorPicker(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Tier label */}
      <div className="flex-1">
        {isEditingLabel ? (
          <input
            ref={labelInputRef}
            type="text"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value.slice(0, 20))}
            onBlur={handleLabelSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSave();
              if (e.key === 'Escape') {
                setLabelValue(tier.displayName);
                setIsEditingLabel(false);
              }
            }}
            className="w-full px-2 py-1 bg-slate-700 border border-cyan-500 rounded text-white text-sm focus:outline-none"
            maxLength={20}
          />
        ) : (
          <button
            onClick={() => setIsEditingLabel(true)}
            className="text-left w-full px-2 py-1 text-white text-sm font-medium hover:bg-slate-700/50 rounded transition-colors"
          >
            {tier.displayName}
            <span className="text-slate-500 text-xs ml-2">
              (click to edit)
            </span>
          </button>
        )}
        <p className="text-xs text-slate-500 px-2 mt-0.5">{tier.description}</p>
      </div>

      {/* Position indicator */}
      <span className="text-xs text-slate-500 font-mono">#{index + 1}</span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
          aria-label="Change color"
        >
          <Palette className="w-4 h-4" />
        </button>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
            aria-label="Remove tier"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}

/**
 * Tier Configuration Editor Modal
 * Allows users to create, edit, and manage custom tier configurations
 */
export function TierConfigEditor({
  isOpen,
  onClose,
  onApplyPreset,
}: TierConfigEditorProps) {
  const tierConfig = useRankingStore((state) => state.tierConfig);
  const setTierConfig = useRankingStore((state) => state.setTierConfig);
  const addTier = useRankingStore((state) => state.addTier);
  const removeTier = useRankingStore((state) => state.removeTier);
  const updateTier = useRankingStore((state) => state.updateTier);
  const reorderTiers = useRankingStore((state) => state.reorderTiers);

  const [editingTiers, setEditingTiers] = useState<EditableTier[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Initialize editing tiers from current config
  useEffect(() => {
    if (isOpen) {
      setEditingTiers(tierConfig.tiers.map(t => ({ ...t })));
      setHasChanges(false);
    }
  }, [isOpen, tierConfig.tiers]);

  const handleReorder = useCallback((newOrder: EditableTier[]) => {
    setEditingTiers(newOrder);
    setHasChanges(true);
  }, []);

  const handleUpdateTier = useCallback((tierId: string, updates: Partial<TierDefinition>) => {
    setEditingTiers(prev =>
      prev.map(t => (t.id === tierId ? { ...t, ...updates } : t))
    );
    setHasChanges(true);
  }, []);

  const handleRemoveTier = useCallback((tierId: string) => {
    if (editingTiers.length <= 2) return;
    setEditingTiers(prev => prev.filter(t => t.id !== tierId));
    setHasChanges(true);
  }, [editingTiers.length]);

  const handleAddTier = useCallback(() => {
    if (editingTiers.length >= 10) return;

    const colors = TIER_COLOR_PALETTES.classic;
    const colorIndex = editingTiers.length % colors.length;

    const newTier: EditableTier = {
      id: `custom-${Date.now()}`,
      label: 'S', // Base label
      displayName: `Tier ${editingTiers.length + 1}`,
      description: 'Custom tier',
      color: createTierColor(colors[colorIndex]),
      isNew: true,
    };

    setEditingTiers(prev => [...prev, newTier]);
    setHasChanges(true);
  }, [editingTiers.length]);

  const handleSave = useCallback(() => {
    // Apply changes to store
    setTierConfig({
      ...tierConfig,
      presetId: 'custom',
      tiers: editingTiers.map(({ isNew, ...t }) => t),
    });
    setHasChanges(false);
    onClose();
  }, [editingTiers, tierConfig, setTierConfig, onClose]);

  const handleReset = useCallback(() => {
    setEditingTiers(tierConfig.tiers.map(t => ({ ...t })));
    setHasChanges(false);
  }, [tierConfig.tiers]);

  const handleApplyPreset = useCallback((preset: CustomTierPreset) => {
    setEditingTiers(preset.tiers.map(t => ({
      id: t.id,
      label: t.label,
      displayName: t.customLabel || t.displayName,
      description: t.description,
      color: t.color,
    })));
    setHasChanges(true);
    setShowPresets(false);
    onApplyPreset?.(preset);
  }, [onApplyPreset]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div>
              <h2 className="text-xl font-bold text-white">
                Customize Tier List
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Add, remove, and reorder tiers. Drag to reorder.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-800/30">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                  ${showPresets ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
                `}
              >
                {showPresets ? 'Hide Presets' : 'Browse Presets'}
              </button>
              <span className="text-xs text-slate-500">
                {editingTiers.length} / 10 tiers
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}
              <button
                onClick={handleAddTier}
                disabled={editingTiers.length >= 10}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 text-white hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Tier
              </button>
            </div>
          </div>

          {/* Preset gallery (collapsible) */}
          <AnimatePresence>
            {showPresets && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-slate-800 overflow-hidden"
              >
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                  {SYSTEM_TIER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 text-left transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {preset.tiers.slice(0, 4).map((t, i) => (
                          <div
                            key={t.id}
                            className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center"
                            style={{
                              background: t.color.gradient,
                              color: t.color.text,
                            }}
                          >
                            {t.customLabel?.[0] || t.label}
                          </div>
                        ))}
                        {preset.tiers.length > 4 && (
                          <span className="text-xs text-slate-500">
                            +{preset.tiers.length - 4}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                        {preset.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tier list */}
          <div className="flex-1 overflow-y-auto p-4">
            <Reorder.Group
              axis="y"
              values={editingTiers}
              onReorder={handleReorder}
              className="space-y-2"
            >
              {editingTiers.map((tier, index) => (
                <TierEditorRow
                  key={tier.id}
                  tier={tier}
                  index={index}
                  onUpdate={(updates) => handleUpdateTier(tier.id, updates)}
                  onRemove={() => handleRemoveTier(tier.id)}
                  canRemove={editingTiers.length > 2}
                />
              ))}
            </Reorder.Group>

            {editingTiers.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No tiers configured. Add a tier to get started.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-800/30">
            <p className="text-xs text-slate-500">
              {hasChanges ? 'You have unsaved changes' : 'No changes'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TierConfigEditor;
