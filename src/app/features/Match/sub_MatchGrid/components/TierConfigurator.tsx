"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  X,
  Palette,
  Type,
  ChevronDown,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  Share2,
} from 'lucide-react';
import {
  TierListTier,
  TierListPreset,
  TIER_LIST_PRESETS,
  createCustomTier,
} from '../../lib/tierPresets';
import { TIER_COLORS, TIER_DESCRIPTIONS } from '@/lib/tiers/constants';
import { ExtendedTierLabel } from '@/lib/tiers/types';

interface TierConfiguratorProps {
  currentPreset: TierListPreset;
  tiers: TierListTier[];
  onPresetChange: (preset: TierListPreset) => void;
  onTierUpdate: (tierId: string, updates: Partial<TierListTier>) => void;
  onTierAdd: (tier: TierListTier) => void;
  onTierRemove: (tierId: string) => void;
  onTiersReset: () => void;
  onExport: () => void;
}

/**
 * Color picker options
 */
const TIER_COLOR_OPTIONS: { label: ExtendedTierLabel; color: string }[] = [
  { label: 'S', color: TIER_COLORS['S'].primary },
  { label: 'A', color: TIER_COLORS['A'].primary },
  { label: 'B', color: TIER_COLORS['B'].primary },
  { label: 'C', color: TIER_COLORS['C'].primary },
  { label: 'D', color: TIER_COLORS['D'].primary },
  { label: 'F', color: TIER_COLORS['F'].primary },
];

/**
 * Single tier editor row
 */
function TierEditor({
  tier,
  onUpdate,
  onRemove,
  canRemove,
}: {
  tier: TierListTier;
  onUpdate: (updates: Partial<TierListTier>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(tier.customLabel || tier.label);

  const handleLabelSave = () => {
    onUpdate({ customLabel: editLabel });
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
      {/* Color indicator/picker */}
      <div
        className="w-8 h-8 rounded cursor-pointer hover:ring-2 ring-white/30 transition-all"
        style={{ background: tier.customColor || tier.color.primary }}
        onClick={() => {
          // Cycle through colors
          const currentIndex = TIER_COLOR_OPTIONS.findIndex(
            (opt) => opt.color === (tier.customColor || tier.color.primary)
          );
          const nextIndex = (currentIndex + 1) % TIER_COLOR_OPTIONS.length;
          onUpdate({ customColor: TIER_COLOR_OPTIONS[nextIndex].color });
        }}
        title="Click to change color"
      />

      {/* Label editor */}
      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSave();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <span className="font-medium">{tier.customLabel || tier.label}</span>
            <Type className="w-3 h-3 text-slate-500" />
          </button>
        )}
      </div>

      {/* Item count */}
      <span className="text-xs text-slate-500">
        {tier.items.length} items
      </span>

      {/* Remove button */}
      {canRemove && (
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
          title="Remove tier"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Preset selector dropdown
 */
function PresetSelector({
  currentPreset,
  onSelect,
}: {
  currentPreset: TierListPreset;
  onSelect: (preset: TierListPreset) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 hover:border-slate-500 transition-colors text-sm"
      >
        <span className="text-slate-300">{currentPreset.name}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {/* Categories */}
              {['General', 'Gaming', 'Sports', 'Entertainment', 'Music', 'Anime', 'Food'].map((category) => {
                const presets = TIER_LIST_PRESETS.filter(
                  (p) =>
                    p.category.toLowerCase() === category.toLowerCase() ||
                    (category === 'General' && p.category === 'general')
                );

                if (presets.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-900/50">
                      {category}
                    </div>
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onSelect(preset);
                          setIsOpen(false);
                        }}
                        className={`
                          w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors
                          ${
                            currentPreset.id === preset.id
                              ? 'bg-cyan-500/10 text-cyan-300'
                              : 'text-slate-300'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{preset.name}</div>
                            <div className="text-xs text-slate-500">
                              {preset.tiers.length} tiers
                            </div>
                          </div>
                          {currentPreset.id === preset.id && (
                            <Check className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Tier configurator panel
 */
export function TierConfigurator({
  currentPreset,
  tiers,
  onPresetChange,
  onTierUpdate,
  onTierAdd,
  onTierRemove,
  onTiersReset,
  onExport,
}: TierConfiguratorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddTier = useCallback(() => {
    const newTier = createCustomTier(
      'New',
      TIER_COLOR_OPTIONS[tiers.length % TIER_COLOR_OPTIONS.length].color,
      tiers.length
    );
    onTierAdd(newTier);
  }, [tiers.length, onTierAdd]);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          transition-colors text-sm font-medium
          ${
            isOpen
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
              : 'bg-slate-800 text-slate-300 border border-slate-600 hover:border-slate-500'
          }
        `}
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Customize</span>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-0 right-0 h-full w-full sm:w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Customize Tiers</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Preset selector */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Preset
                </label>
                <PresetSelector
                  currentPreset={currentPreset}
                  onSelect={onPresetChange}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {currentPreset.description}
                </p>
              </div>

              {/* Tier list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-400">
                    Tiers
                  </label>
                  <button
                    onClick={handleAddTier}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {tiers.map((tier, index) => (
                    <TierEditor
                      key={tier.id}
                      tier={tier}
                      onUpdate={(updates) => onTierUpdate(tier.id, updates)}
                      onRemove={() => onTierRemove(tier.id)}
                      canRemove={tiers.length > 2}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-slate-700">
                <button
                  onClick={onTiersReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Default
                </button>

                <button
                  onClick={onExport}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium transition-all text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export as Image
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default TierConfigurator;
