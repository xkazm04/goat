"use client";

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Check,
  Star,
  Gamepad2,
  Trophy,
  Film,
  Music,
  Utensils,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  SYSTEM_TIER_PRESETS,
  getPresetsByCategory,
  getPresetCategories,
  type CustomTierPreset,
} from '@/lib/tier/customPresets';

interface TierPresetGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: CustomTierPreset) => void;
  currentPresetId?: string;
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, typeof Star> = {
  general: Sparkles,
  gaming: Gamepad2,
  sports: Trophy,
  entertainment: Film,
  music: Music,
  food: Utensils,
};

/**
 * Preview of tier colors in a row
 */
function TierPreview({ preset }: { preset: CustomTierPreset }) {
  return (
    <div className="flex items-center gap-1">
      {preset.tiers.slice(0, 6).map((tier, i) => (
        <motion.div
          key={tier.id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm"
          style={{
            background: tier.color.gradient,
            color: tier.color.text,
          }}
          title={tier.customLabel || tier.displayName}
        >
          {(tier.customLabel || tier.label).slice(0, 2)}
        </motion.div>
      ))}
      {preset.tiers.length > 6 && (
        <span className="text-xs text-slate-500 ml-1">
          +{preset.tiers.length - 6}
        </span>
      )}
    </div>
  );
}

/**
 * Single preset card
 */
function PresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: CustomTierPreset;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const CategoryIcon = CATEGORY_ICONS[preset.category] || Sparkles;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        relative w-full p-4 rounded-xl border text-left transition-all
        ${isSelected
          ? 'bg-cyan-500/10 border-cyan-500/50 ring-2 ring-cyan-500/30'
          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600'
        }
      `}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-400'}
          `}
        >
          <CategoryIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
            {preset.name}
          </h3>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {preset.description}
          </p>
        </div>
      </div>

      {/* Tier preview */}
      <TierPreview preset={preset} />

      {/* Metadata */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
        <span className="text-xs text-slate-500">
          {preset.tiers.length} tiers
        </span>
        <span className="text-xs text-slate-500 capitalize">
          {preset.category}
        </span>
      </div>
    </motion.button>
  );
}

/**
 * Category filter tabs
 */
function CategoryTabs({
  categories,
  selected,
  onSelect,
}: {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
      {categories.map((category) => {
        const Icon = CATEGORY_ICONS[category] || Sparkles;
        const isSelected = selected === category;

        return (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${isSelected
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
              }
            `}
          >
            {category !== 'all' && <Icon className="w-4 h-4" />}
            <span className="capitalize">{category}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Tier Preset Gallery Modal
 * Browse and select from preset tier configurations
 */
export function TierPresetGallery({
  isOpen,
  onClose,
  onSelectPreset,
  currentPresetId,
}: TierPresetGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<CustomTierPreset | null>(null);

  const categories = useMemo(() => getPresetCategories(), []);

  const filteredPresets = useMemo(() => {
    let presets = selectedCategory === 'all'
      ? SYSTEM_TIER_PRESETS
      : getPresetsByCategory(selectedCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      presets = presets.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tiers.some(t =>
            t.displayName.toLowerCase().includes(query) ||
            (t.customLabel?.toLowerCase().includes(query) ?? false)
          )
      );
    }

    return presets;
  }, [selectedCategory, searchQuery]);

  const handleSelect = useCallback((preset: CustomTierPreset) => {
    setSelectedPreset(preset);
  }, []);

  const handleApply = useCallback(() => {
    if (selectedPreset) {
      onSelectPreset(selectedPreset);
      onClose();
    }
  }, [selectedPreset, onSelectPreset, onClose]);

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
          className="w-full max-w-4xl max-h-[85vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div>
              <h2 className="text-xl font-bold text-white">
                Tier List Presets
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Choose a preset to customize your tier list
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

          {/* Search and filters */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search presets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Category tabs */}
            <CategoryTabs
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          {/* Preset grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredPresets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Search className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No presets found</p>
                <p className="text-sm">Try a different search or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isSelected={selectedPreset?.id === preset.id || currentPresetId === preset.id}
                    onSelect={() => handleSelect(preset)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer with preview */}
          <div className="p-4 border-t border-slate-700 bg-slate-800/30">
            {selectedPreset ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Selected preset:</p>
                    <p className="font-semibold text-white">{selectedPreset.name}</p>
                  </div>
                  <TierPreview preset={selectedPreset} />
                </div>
                <button
                  onClick={handleApply}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors"
                >
                  Apply Preset
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Select a preset to preview and apply
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact preset selector for inline use
 */
export function TierPresetSelector({
  currentPresetId,
  onSelectPreset,
}: {
  currentPresetId?: string;
  onSelectPreset: (preset: CustomTierPreset) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const currentPreset = SYSTEM_TIER_PRESETS.find(p => p.id === currentPresetId);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors group"
      >
        {currentPreset ? (
          <>
            <div className="flex items-center gap-0.5">
              {currentPreset.tiers.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center"
                  style={{
                    background: t.color.gradient,
                    color: t.color.text,
                  }}
                >
                  {(t.customLabel || t.label)[0]}
                </div>
              ))}
            </div>
            <span className="text-sm text-white">{currentPreset.name}</span>
          </>
        ) : (
          <span className="text-sm text-slate-400">Select preset...</span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
      </button>

      <TierPresetGallery
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectPreset={onSelectPreset}
        currentPresetId={currentPresetId}
      />
    </>
  );
}

export default TierPresetGallery;
