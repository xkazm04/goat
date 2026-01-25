'use client';

/**
 * TierRowCustomizer
 * UI for adding, removing, and reordering tier rows
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TierDefinition, ExtendedTierLabel } from '@/lib/tiers/types';
import { TierAssignment } from '@/lib/tiers/TierConverter';
import { TIER_COLORS } from '@/lib/tiers/constants';

/**
 * Get color from TIER_COLORS by index
 */
const TIER_LABEL_ORDER: ExtendedTierLabel[] = ['S', 'A', 'B', 'C', 'D', 'F', 'S+', 'A+', 'A-', 'B+', 'B-', 'C+', 'C-', 'D+', 'D-'];

function getTierColorByIndex(index: number): TierDefinition['color'] {
  const label = TIER_LABEL_ORDER[index % TIER_LABEL_ORDER.length];
  return TIER_COLORS[label];
}
import {
  Plus,
  Minus,
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Palette,
  Settings,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';

/**
 * Default tier labels for new tiers
 */
const DEFAULT_TIER_LABELS = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

/**
 * Color preset for tier customization
 */
interface ColorPreset {
  id: string;
  name: string;
  primary: string;
  gradient: string;
  text: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  { id: 'gold', name: 'Gold', primary: '#FFD700', gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', text: '#000' },
  { id: 'red', name: 'Red', primary: '#FF4444', gradient: 'linear-gradient(135deg, #FF4444 0%, #CC0000 100%)', text: '#FFF' },
  { id: 'orange', name: 'Orange', primary: '#FF8C00', gradient: 'linear-gradient(135deg, #FF8C00 0%, #FF6600 100%)', text: '#FFF' },
  { id: 'yellow', name: 'Yellow', primary: '#FFD700', gradient: 'linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)', text: '#000' },
  { id: 'green', name: 'Green', primary: '#4CAF50', gradient: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)', text: '#FFF' },
  { id: 'blue', name: 'Blue', primary: '#2196F3', gradient: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)', text: '#FFF' },
  { id: 'purple', name: 'Purple', primary: '#9C27B0', gradient: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)', text: '#FFF' },
  { id: 'pink', name: 'Pink', primary: '#E91E63', gradient: 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)', text: '#FFF' },
  { id: 'gray', name: 'Gray', primary: '#607D8B', gradient: 'linear-gradient(135deg, #607D8B 0%, #455A64 100%)', text: '#FFF' },
];

interface TierRowCustomizerProps {
  /** Current tiers */
  tiers: TierDefinition[];
  /** Current assignments (to know item counts) */
  assignments?: TierAssignment[];
  /** Called when tiers change */
  onTiersChange: (tiers: TierDefinition[]) => void;
  /** Min number of tiers allowed */
  minTiers?: number;
  /** Max number of tiers allowed */
  maxTiers?: number;
  /** Allow tier reordering */
  allowReorder?: boolean;
  /** Allow color customization */
  allowColorChange?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Single tier row editor
 */
function TierEditor({
  tier,
  index,
  itemCount,
  canDelete,
  canMoveUp,
  canMoveDown,
  allowColorChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onColorChange,
}: {
  tier: TierDefinition;
  index: number;
  itemCount: number;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  allowColorChange: boolean;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onColorChange: (color: ColorPreset) => void;
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <Reorder.Item
      value={tier}
      id={tier.id}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'border border-border/50 bg-background',
        'cursor-grab active:cursor-grabbing'
      )}
    >
      {/* Drag handle */}
      <GripVertical className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />

      {/* Tier color preview */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg cursor-pointer hover:ring-2 hover:ring-primary transition-all"
        style={{
          background: tier.color.gradient,
          color: tier.color.text,
        }}
        onClick={() => allowColorChange && setShowColorPicker(!showColorPicker)}
      >
        {tier.label}
      </div>

      {/* Tier info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{tier.label} Tier</span>
          {tier.description && (
            <span className="text-xs text-muted-foreground truncate">
              {tier.description}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {itemCount} item{itemCount !== 1 ? 's' : ''} • Positions {tier.startPosition + 1}-{tier.endPosition}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Move buttons */}
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Color picker toggle */}
        {allowColorChange && (
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={cn(
              'p-1.5 rounded hover:bg-muted',
              showColorPicker && 'bg-primary/10 text-primary'
            )}
            title="Change color"
          >
            <Palette className="w-4 h-4" />
          </button>
        )}

        {/* Delete button */}
        <button
          onClick={onDelete}
          disabled={!canDelete}
          className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Remove tier"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Color picker dropdown */}
      <AnimatePresence>
        {showColorPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute right-0 top-full mt-2 z-10"
          >
            <div className="p-2 rounded-lg border bg-popover shadow-lg">
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onColorChange(preset);
                      setShowColorPicker(false);
                    }}
                    className={cn(
                      'w-8 h-8 rounded-lg transition-transform',
                      'hover:scale-110 hover:ring-2 hover:ring-primary'
                    )}
                    style={{ background: preset.gradient }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

/**
 * TierRowCustomizer component
 */
export function TierRowCustomizer({
  tiers,
  assignments = [],
  onTiersChange,
  minTiers = 3,
  maxTiers = 9,
  allowReorder = true,
  allowColorChange = true,
  className,
}: TierRowCustomizerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get item count for each tier
  const itemCounts = new Map(
    assignments.map((a) => [a.tierId, a.items.length])
  );

  // Add new tier
  const handleAddTier = useCallback(() => {
    if (tiers.length >= maxTiers) return;

    const newIndex = tiers.length;
    const label = DEFAULT_TIER_LABELS[newIndex] as ExtendedTierLabel || 'F';
    const color = getTierColorByIndex(newIndex);

    // Calculate new positions
    const listSize = tiers[tiers.length - 1]?.endPosition || 10;
    const newTierSize = Math.floor(listSize / (tiers.length + 1));

    // Redistribute positions
    const newTiers: TierDefinition[] = [];
    let position = 0;

    for (let i = 0; i <= tiers.length; i++) {
      const isNewTier = i === tiers.length;
      const tierSize = isNewTier ? listSize - position : newTierSize;

      if (isNewTier) {
        newTiers.push({
          id: `tier-${Date.now()}-${i}`,
          label,
          displayName: `${label} Tier`,
          description: '',
          color,
          startPosition: position,
          endPosition: listSize,
        });
      } else {
        newTiers.push({
          ...tiers[i],
          startPosition: position,
          endPosition: position + tierSize,
        });
        position += tierSize;
      }
    }

    onTiersChange(newTiers);
  }, [tiers, maxTiers, onTiersChange]);

  // Remove tier
  const handleRemoveTier = useCallback(
    (index: number) => {
      if (tiers.length <= minTiers) return;

      const newTiers = tiers.filter((_, i) => i !== index);

      // Redistribute positions
      const listSize = tiers[tiers.length - 1]?.endPosition || 10;
      const tierSize = Math.floor(listSize / newTiers.length);

      const redistributed = newTiers.map((tier, i) => ({
        ...tier,
        startPosition: i * tierSize,
        endPosition: i === newTiers.length - 1 ? listSize : (i + 1) * tierSize,
      }));

      onTiersChange(redistributed);
    },
    [tiers, minTiers, onTiersChange]
  );

  // Move tier up
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;

      const newTiers = [...tiers];
      [newTiers[index - 1], newTiers[index]] = [newTiers[index], newTiers[index - 1]];

      // Update positions
      const listSize = tiers[tiers.length - 1]?.endPosition || 10;
      const redistributed = recalculatePositions(newTiers, listSize);

      onTiersChange(redistributed);
    },
    [tiers, onTiersChange]
  );

  // Move tier down
  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= tiers.length - 1) return;

      const newTiers = [...tiers];
      [newTiers[index], newTiers[index + 1]] = [newTiers[index + 1], newTiers[index]];

      // Update positions
      const listSize = tiers[tiers.length - 1]?.endPosition || 10;
      const redistributed = recalculatePositions(newTiers, listSize);

      onTiersChange(redistributed);
    },
    [tiers, onTiersChange]
  );

  // Change tier color
  const handleColorChange = useCallback(
    (index: number, preset: ColorPreset) => {
      const newTiers = tiers.map((tier, i) => {
        if (i !== index) return tier;
        return {
          ...tier,
          color: {
            ...tier.color,  // Keep existing properties
            primary: preset.primary,
            gradient: preset.gradient,
            text: preset.text,
          },
        };
      });

      onTiersChange(newTiers);
    },
    [tiers, onTiersChange]
  );

  // Handle reorder via drag
  const handleReorder = useCallback(
    (newOrder: TierDefinition[]) => {
      const listSize = tiers[tiers.length - 1]?.endPosition || 10;
      const redistributed = recalculatePositions(newOrder, listSize);
      onTiersChange(redistributed);
    },
    [tiers, onTiersChange]
  );

  // Reset to defaults
  const handleReset = useCallback(() => {
    // This would need access to original preset - skip for now
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary"
        >
          <Settings className="w-4 h-4" />
          <span>Customize Tiers</span>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="text-muted-foreground"
          >
            ▼
          </motion.span>
        </button>

        {/* Quick add/remove */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleRemoveTier(tiers.length - 1)}
            disabled={tiers.length <= minTiers}
            className="p-1.5 rounded border hover:bg-muted disabled:opacity-30"
            title="Remove last tier"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm px-2">{tiers.length}</span>
          <button
            onClick={handleAddTier}
            disabled={tiers.length >= maxTiers}
            className="p-1.5 rounded border hover:bg-muted disabled:opacity-30"
            title="Add tier"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2">
              {allowReorder ? (
                <Reorder.Group
                  axis="y"
                  values={tiers}
                  onReorder={handleReorder}
                  className="space-y-2"
                >
                  {tiers.map((tier, index) => (
                    <TierEditor
                      key={tier.id}
                      tier={tier}
                      index={index}
                      itemCount={itemCounts.get(tier.id) || 0}
                      canDelete={tiers.length > minTiers}
                      canMoveUp={index > 0}
                      canMoveDown={index < tiers.length - 1}
                      allowColorChange={allowColorChange}
                      onDelete={() => handleRemoveTier(index)}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                      onColorChange={(color) => handleColorChange(index, color)}
                    />
                  ))}
                </Reorder.Group>
              ) : (
                <div className="space-y-2">
                  {tiers.map((tier, index) => (
                    <div
                      key={tier.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
                        style={{
                          background: tier.color.gradient,
                          color: tier.color.text,
                        }}
                      >
                        {tier.label}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{tier.label} Tier</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {itemCounts.get(tier.id) || 0} items
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add tier button */}
              {tiers.length < maxTiers && (
                <button
                  onClick={handleAddTier}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 p-3',
                    'rounded-lg border border-dashed border-muted-foreground/30',
                    'text-muted-foreground hover:text-foreground hover:border-primary/30',
                    'transition-colors'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Tier</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Helper to recalculate tier positions
 */
function recalculatePositions(
  tiers: TierDefinition[],
  listSize: number
): TierDefinition[] {
  const tierSize = Math.floor(listSize / tiers.length);

  return tiers.map((tier, i) => ({
    ...tier,
    startPosition: i * tierSize,
    endPosition: i === tiers.length - 1 ? listSize : (i + 1) * tierSize,
  }));
}

export default TierRowCustomizer;
