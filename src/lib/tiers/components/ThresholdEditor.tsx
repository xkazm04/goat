'use client';

/**
 * ThresholdEditor
 * Visual interface for customizing tier thresholds
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useThresholdStore,
  useAllPresets,
  useTierDistribution,
  ThresholdPreset,
  BUILT_IN_PRESETS,
} from '@/stores/threshold-store';
import {
  ALGORITHM_PRESETS,
  AlgorithmPresetDefinition,
  getBestPresetForSize,
} from '../constants';
import { createTiersFromBoundaries } from '../TierCalculator';
import { ThresholdRecommender, ThresholdRecommendation } from '../ThresholdRecommender';
import { ThresholdSlider } from './ThresholdSlider';

interface ThresholdEditorProps {
  /** List ID for persistence */
  listId: string;
  /** Total list size */
  listSize: number;
  /** Number of tiers */
  tierCount?: number;
  /** Filled positions for recommendations */
  filledPositions?: number[];
  /** Called when thresholds change */
  onThresholdsChange?: (boundaries: number[]) => void;
  /** Called when save is clicked */
  onSave?: () => void;
  /** Compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Preset selector card
 */
function PresetCard({
  preset,
  isSelected,
  onClick,
  tierCount,
  listSize,
}: {
  preset: AlgorithmPresetDefinition;
  isSelected: boolean;
  onClick: () => void;
  tierCount: number;
  listSize: number;
}) {
  const percentages = preset.getPercentages(tierCount);

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border transition-all text-left',
        'hover:border-primary/50 hover:bg-primary/5',
        isSelected
          ? 'border-primary bg-primary/10 ring-1 ring-primary'
          : 'border-border'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{preset.icon}</span>
        <span className="font-medium text-sm">{preset.name}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        {preset.description}
      </p>

      {/* Mini preview bar */}
      <div className="h-2 rounded-full overflow-hidden flex bg-muted">
        {percentages.map((pct, i) => {
          const prevPct = i === 0 ? 0 : percentages[i - 1];
          const width = (i === percentages.length - 1 ? 100 : percentages[i]) - prevPct;
          return (
            <div
              key={i}
              className="h-full"
              style={{
                width: `${width}%`,
                opacity: 0.3 + (i / percentages.length) * 0.7,
                backgroundColor: `hsl(${30 + i * 40}, 70%, 50%)`,
              }}
            />
          );
        })}
      </div>
    </button>
  );
}

/**
 * Recommendation card
 */
function RecommendationCard({
  recommendation,
  isTop,
  onApply,
}: {
  recommendation: ThresholdRecommendation;
  isTop: boolean;
  onApply: () => void;
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        isTop ? 'border-green-500/50 bg-green-500/10' : 'border-border'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{recommendation.algorithm.icon}</span>
          <span className="font-medium">{recommendation.algorithm.name}</span>
          {isTop && (
            <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
              Recommended
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {recommendation.confidence}% match
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        {recommendation.reasoning}
      </p>

      {recommendation.pros.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {recommendation.pros.slice(0, 2).map((pro, i) => (
            <span
              key={i}
              className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded"
            >
              ✓ {pro}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={onApply}
        className="text-sm text-primary hover:underline"
      >
        Apply this preset →
      </button>
    </div>
  );
}

/**
 * Distribution preview
 */
function DistributionPreview({
  distribution,
  tierCount,
}: {
  distribution: number[];
  tierCount: number;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Distribution</p>
      <div className="flex items-end gap-1 h-16">
        {distribution.map((pct, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center"
          >
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${pct}%`,
                minHeight: '4px',
                backgroundColor: `hsl(${30 + i * (180 / tierCount)}, 70%, 50%)`,
              }}
            />
            <span className="text-[10px] text-muted-foreground mt-1">
              {pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Custom preset save modal
 */
function SavePresetModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border rounded-lg p-6 w-full max-w-md mx-4"
      >
        <h3 className="text-lg font-semibold mb-4">Save Custom Preset</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              Preset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Preset"
              className="w-full px-3 py-2 rounded-lg border bg-background"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your preset..."
              className="w-full px-3 py-2 rounded-lg border bg-background resize-none"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Save Preset
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ThresholdEditor component
 */
export function ThresholdEditor({
  listId,
  listSize,
  tierCount: initialTierCount = 5,
  filledPositions = [],
  onThresholdsChange,
  onSave,
  compact = false,
  className,
}: ThresholdEditorProps) {
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [tierCount, setTierCount] = useState(initialTierCount);

  // Store state
  const {
    currentBoundaries,
    selectedAlgorithm,
    hasUnsavedChanges,
    initialize,
    setAlgorithm,
    setBoundary,
    setBoundaries,
    saveCustomPreset,
    saveThresholds,
    reset,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useThresholdStore();

  const distribution = useTierDistribution();

  // Initialize on mount
  useEffect(() => {
    initialize(listId, listSize, tierCount);
  }, [listId, listSize, tierCount, initialize]);

  // Notify parent of changes
  useEffect(() => {
    if (currentBoundaries.length > 0) {
      onThresholdsChange?.(currentBoundaries);
    }
  }, [currentBoundaries, onThresholdsChange]);

  // Get preset for tier creation
  const preset = useMemo(() => getBestPresetForSize(listSize), [listSize]);

  // Create tier definitions from boundaries
  const tiers = useMemo(() => {
    if (currentBoundaries.length < 2) return [];
    return createTiersFromBoundaries(currentBoundaries, preset);
  }, [currentBoundaries, preset]);

  // Get recommendations
  const recommendations = useMemo(() => {
    const recommender = new ThresholdRecommender({
      listSize,
      filledPositions,
      tierCount,
    });
    return recommender.getAllRecommendations();
  }, [listSize, filledPositions, tierCount]);

  // Handle preset selection
  const handlePresetSelect = useCallback((algo: AlgorithmPresetDefinition) => {
    const percentages = algo.getPercentages(tierCount);
    const boundaries = [0];
    for (const pct of percentages) {
      boundaries.push(Math.round((pct / 100) * listSize));
    }
    boundaries.push(listSize);

    setBoundaries(boundaries);
    setAlgorithm(algo.algorithm);
  }, [tierCount, listSize, setBoundaries, setAlgorithm]);

  // Handle boundary change from slider
  const handleBoundaryChange = useCallback((index: number, position: number) => {
    setBoundary(index, position);
  }, [setBoundary]);

  // Handle save
  const handleSave = useCallback(() => {
    saveThresholds();
    onSave?.();
  }, [saveThresholds, onSave]);

  // Handle custom preset save
  const handleSaveCustomPreset = useCallback((name: string, description?: string) => {
    saveCustomPreset(name, description);
  }, [saveCustomPreset]);

  // Apply recommendation
  const applyRecommendation = useCallback((rec: ThresholdRecommendation) => {
    setBoundaries(rec.boundaries);
    setAlgorithm(rec.algorithm.algorithm);
    setShowRecommendations(false);
  }, [setBoundaries, setAlgorithm]);

  if (currentBoundaries.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        Loading...
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tier Thresholds</h3>
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
            title="Undo"
          >
            ↶
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
            title="Redo"
          >
            ↷
          </button>

          {/* Reset */}
          <button
            onClick={reset}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Slider */}
      <ThresholdSlider
        boundaries={currentBoundaries}
        listSize={listSize}
        tiers={tiers}
        onBoundaryChange={handleBoundaryChange}
        showLabels={!compact}
        showPercentages={!compact}
        height={compact ? 40 : 56}
      />

      {/* Distribution preview */}
      {!compact && distribution.length > 0 && (
        <DistributionPreview distribution={distribution} tierCount={tierCount} />
      )}

      {/* Preset selection */}
      {!compact && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Algorithm Presets</p>
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="text-sm text-primary hover:underline"
            >
              {showRecommendations ? 'Hide' : 'Show'} recommendations
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALGORITHM_PRESETS.map((algo) => (
              <PresetCard
                key={algo.id}
                preset={algo}
                isSelected={selectedAlgorithm === algo.algorithm}
                onClick={() => handlePresetSelect(algo)}
                tierCount={tierCount}
                listSize={listSize}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <AnimatePresence>
        {showRecommendations && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <p className="text-sm font-medium">Recommendations for your list</p>
            {recommendations.slice(0, 3).map((rec, i) => (
              <RecommendationCard
                key={rec.algorithm.id}
                recommendation={rec}
                isTop={i === 0}
                onApply={() => applyRecommendation(rec)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier count selector */}
      {!compact && (
        <div className="flex items-center gap-4">
          <label className="text-sm text-muted-foreground">Tier Count:</label>
          <div className="flex gap-1">
            {[3, 4, 5, 6, 7, 9].map((count) => (
              <button
                key={count}
                onClick={() => {
                  setTierCount(count);
                  initialize(listId, listSize, count);
                }}
                className={cn(
                  'w-8 h-8 rounded text-sm',
                  count === tierCount
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <button
          onClick={() => setShowSaveModal(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Save as preset
        </button>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-500">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Save preset modal */}
      <SavePresetModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveCustomPreset}
      />
    </div>
  );
}

/**
 * Compact inline editor
 */
export function ThresholdEditorInline({
  listId,
  listSize,
  tierCount = 5,
  onThresholdsChange,
  className,
}: Omit<ThresholdEditorProps, 'compact' | 'filledPositions' | 'onSave'>) {
  return (
    <ThresholdEditor
      listId={listId}
      listSize={listSize}
      tierCount={tierCount}
      onThresholdsChange={onThresholdsChange}
      compact
      className={className}
    />
  );
}

export default ThresholdEditor;
