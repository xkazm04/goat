"use client";

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { memo, useMemo, forwardRef } from 'react';

import { TierEmptyIllustration } from '@/components/illustrations/TierEmptyIllustration';
import { createUnifiedTierRowDropData } from '@/lib/dnd/unified-protocol';
import { useDropZoneHighlightStore } from '@/stores/drop-zone-highlight-store';
import { useCurrentList } from '@/stores/use-list-store';
import { BacklogItem } from '@/types/backlog-groups';

import { TierItem } from './TierItem';
import { TierListTier } from '../../lib/tierPresets';

interface TierRowProps {
  tier: TierListTier;
  items: BacklogItem[];
  isOver?: boolean;
  onToggleCollapse?: (tierId: string) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditTier?: (tier: TierListTier) => void;
  isDraggingOver?: boolean;
  /** Index of this tier for accessibility */
  tierIndex?: number;
  /** Debate mode: per-item controversy data */
  debateInfoMap?: Map<string, { score: number; isHotTake: boolean; hasDebate: boolean }>;
  /** Debate mode: callback when user wants to debate an item */
  onDebateItem?: (itemId: string, itemName: string, tierId: string) => void;
}

/**
 * Single tier row with drop zone and sortable items
 * Uses unified protocol for drop target data.
 * Memoized to prevent re-renders when unrelated tiers change during drag.
 */
export const TierRow = memo(forwardRef<HTMLDivElement, TierRowProps>(function TierRow(
  {
    tier,
    items,
    onToggleCollapse,
    onRemoveItem,
    onEditTier,
    isDraggingOver,
    tierIndex = 0,
    debateInfoMap,
    onDebateItem,
  },
  ref
) {
  // Hoist category check once for all TierItems in this row
  const currentList = useCurrentList();
  const isMusicCategory = currentList?.category?.toLowerCase() === 'music';

  // Use unified protocol for drop data
  const { setNodeRef, isOver } = useDroppable({
    id: `tier-${tier.id}`,
    data: createUnifiedTierRowDropData(tier.id, tierIndex),
  });

  // Get drag state from store (granular selector — only re-renders when isDragging changes)
  const isParentDragging = useDropZoneHighlightStore((s) => s.isDragging);

  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  // Highlight when: hovered over, or parent is dragging (subtle glow)
  const isHighlighted = isOver || isDraggingOver;
  const showMagneticGlow = isParentDragging && !isHighlighted;

  const tierLabel = tier.customLabel || tier.label;

  // Compute background and text color based on custom color or tier colors
  const tierBackground = tier.customColor
    ? `linear-gradient(135deg, ${tier.customColor}, ${tier.customColor}cc)`
    : tier.color.gradient;

  // Calculate text color for custom colors (light text for dark backgrounds)
  const getTextColor = (bgColor?: string) => {
    if (!bgColor) return tier.color.text;
    const hex = bgColor.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#FFFFFF';
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const tierTextColor = tier.customColor ? getTextColor(tier.customColor) : tier.color.text;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex"
      role="listitem"
      aria-label={`${tierLabel} tier with ${items.length} items`}
    >
      {/* Tier label */}
      <div
        className="shrink-0 w-16 sm:w-20 flex flex-col items-center justify-center cursor-pointer hover:brightness-110 transition-all duration-200 focus-ring"
        style={{
          background: tierBackground,
          borderRadius: '8px 0 0 8px',
        }}
        onClick={() => onEditTier?.(tier)}
        role="button"
        aria-label={`Edit ${tierLabel} tier`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEditTier?.(tier);
          }
        }}
      >
        <span
          className="text-tier-label font-bold"
          style={{ color: tierTextColor }}
        >
          {tier.customLabel || tier.label}
        </span>
        {!tier.collapsed && items.length > 0 && (
          <span
            className="text-xs font-medium opacity-80"
            style={{ color: tierTextColor }}
          >
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => onToggleCollapse?.(tier.id)}
        aria-expanded={!tier.collapsed}
        aria-controls={`tier-items-${tier.id}`}
        aria-label={`${tier.collapsed ? 'Expand' : 'Collapse'} ${tierLabel} tier`}
        className="shrink-0 w-6 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/80 transition-all duration-200 focus-ring"
      >
        {tier.collapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
        )}
      </button>

      {/* Items container (drop zone) */}
      <div
        ref={setNodeRef}
        id={`tier-items-${tier.id}`}
        role="group"
        aria-label={`Items in ${tierLabel} tier`}
        className={`
          flex-1 min-h-24 p-3 relative
          bg-slate-900/70 backdrop-blur-xs border border-slate-700/40
          ${tier.collapsed ? 'overflow-hidden max-h-6' : ''}
          transition-all duration-200 ease-out
          ${isHighlighted ? 'bg-slate-800/90 shadow-inner' : ''}
          ${isParentDragging && !isHighlighted ? '' : ''}
        `}
        style={{
          borderRadius: '0 8px 8px 0',
          borderLeft: 'none',
          ...(isHighlighted ? {
            borderColor: `${tier.customColor || tier.color.primary}80`,
            boxShadow: `inset 0 0 12px ${tier.customColor || tier.color.primary}15`,
          } : showMagneticGlow ? {
            borderColor: `${tier.customColor || tier.color.primary}40`,
            boxShadow: `0 0 8px ${tier.customColor || tier.color.primary}08`,
          } : {}),
          ...(isParentDragging ? {
            animation: 'tierPulse 2s ease-in-out infinite',
            outlineColor: `${tier.customColor || tier.color.primary}30`,
          } : {}),
        }}
      >
        <AnimatePresence mode="popLayout">
          {tier.collapsed ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-slate-500 truncate"
            >
              {items.length} items hidden
            </motion.div>
          ) : items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`
                h-full flex items-center justify-center text-xs
                border border-dashed border-slate-700/50 rounded-card
                ${isHighlighted ? 'border-opacity-50' : ''}
              `}
              style={isHighlighted ? {
                borderColor: `${tier.customColor || tier.color.primary}50`,
              } : undefined}
            >
              <TierEmptyIllustration
                tierLabel={tier.customLabel || tier.label}
                color={tier.customColor || tier.color.primary}
                isHighlighted={isHighlighted}
              />
            </motion.div>
          ) : (
            <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {items.map((item, index) => (
                  <TierItem
                    key={item.id}
                    item={item}
                    tierId={tier.id}
                    isMusicCategory={isMusicCategory}
                    onRemove={onRemoveItem}
                    tierColor={tier.customColor || tier.color.primary}
                    debateInfo={debateInfoMap?.get(item.id) ?? null}
                    onDebate={onDebateItem ? (itemId, itemName) => onDebateItem(itemId, itemName, tier.id) : undefined}
                    orderInTier={index}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}));

/**
 * Unranked items pool at the bottom
 * Uses unified protocol for drop target
 */
interface UnrankedPoolProps {
  items: BacklogItem[];
  onAddToTier?: (itemId: string, tierId: string) => void;
}

export function UnrankedPool({ items }: UnrankedPoolProps) {
  const currentList = useCurrentList();
  const isMusicCategory = currentList?.category?.toLowerCase() === 'music';

  // Use unified protocol for drop data
  const { setNodeRef, isOver } = useDroppable({
    id: 'unranked-pool',
    data: {
      type: 'unranked-pool',
    },
  });

  // Get drag state from store (granular selector — only re-renders when isDragging changes)
  const isParentDragging = useDropZoneHighlightStore((s) => s.isDragging);
  const showMagneticGlow = isParentDragging && !isOver;

  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-base font-bold text-slate-400">
          Unranked Items
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-500">
          {items.length}
        </span>
      </div>

      {/* Pool container */}
      <div
        ref={setNodeRef}
        className={`
          min-h-24 p-4 rounded-container
          bg-slate-900/40 backdrop-blur-xs border-2 border-dashed
          ${isOver ? 'border-brand/50 bg-brand/5 shadow-inner shadow-brand/5' : 'border-slate-700/40'}
          ${showMagneticGlow ? 'border-brand/25 shadow-lg shadow-brand/5' : ''}
          transition-all duration-200 ease-out
        `}
      >
        <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => (
                <TierItem
                  key={item.id}
                  item={item}
                  tierId="unranked"
                  isMusicCategory={isMusicCategory}
                  orderInTier={index}
                />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </div>
    </motion.div>
  );
}

export default TierRow;
