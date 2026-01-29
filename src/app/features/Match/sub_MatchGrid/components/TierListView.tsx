"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { arrayMove } from '@dnd-kit/sortable';
import { Users } from 'lucide-react';
import { GridItemType } from '@/types/match';
import { BacklogItem } from '@/types/backlog-groups';
import {
  TierListTier,
  TierListPreset,
  PRESET_CLASSIC,
  tierListToRanking,
  CommunityTierConsensus,
} from '../../lib/tierPresets';
import { TierRow, UnrankedPool } from './TierRow';
import { TierConfigurator } from './TierConfigurator';
import { exportTierListImage } from '../../lib/tierListExporter';
import { useRankingStore } from '@/stores/ranking-store';
import { useDropZoneHighlight, useOptionalDropZoneHighlight } from './DropZoneHighlightContext';

interface TierListViewProps {
  gridItems: GridItemType[];
  backlogItems: BacklogItem[];
  onRankingComplete: (ranking: BacklogItem[]) => void;
  listSize: number;
  listTitle?: string;
}

/**
 * Community comparison toggle
 */
function CommunityComparisonToggle({
  enabled,
  onToggle,
  agreementScore,
}: {
  enabled: boolean;
  onToggle: () => void;
  agreementScore?: number;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={`Community comparison${enabled && agreementScore !== undefined ? `: ${agreementScore.toFixed(0)}% match` : ''}`}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
        ${
          enabled
            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
            : 'bg-slate-800 text-slate-300 border border-slate-600 hover:border-slate-500'
        }
      `}
    >
      <Users className="w-4 h-4" />
      <span className="hidden sm:inline">Community</span>
      {enabled && agreementScore !== undefined && (
        <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-xs">
          {agreementScore.toFixed(0)}% match
        </span>
      )}
    </button>
  );
}

/**
 * Main Tier List View Component
 *
 * Now uses ranking-store for tier state instead of local useState.
 * DnD is handled by parent SimpleMatchGrid's DndContext.
 */
export function TierListView({
  gridItems,
  backlogItems,
  onRankingComplete,
  listSize,
  listTitle = 'Tier List',
}: TierListViewProps) {
  // UI-only state
  const [preset, setPreset] = useState<TierListPreset>(PRESET_CLASSIC);
  const [showCommunityComparison, setShowCommunityComparison] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const tierListRef = useRef<HTMLDivElement>(null);

  // Connect to ranking store for tier state
  const tierState = useRankingStore(state => state.tierState);
  const syncTiersFromRanking = useRankingStore(state => state.syncTiersFromRanking);
  const syncRankingFromTiers = useRankingStore(state => state.syncRankingFromTiers);
  const assignToTier = useRankingStore(state => state.assignToTier);
  const removeFromTier = useRankingStore(state => state.removeFromTier);
  const moveWithinTier = useRankingStore(state => state.moveWithinTier);
  const moveBetweenTiers = useRankingStore(state => state.moveBetweenTiers);
  const addToUnranked = useRankingStore(state => state.addToUnranked);
  const removeFromUnranked = useRankingStore(state => state.removeFromUnranked);

  // Get drag state from context (optional - may not exist if used outside SimpleMatchGrid)
  const dropZoneContext = useOptionalDropZoneHighlight();
  const isDragging = dropZoneContext?.dragState?.isDragging ?? false;

  // Map of item ID to BacklogItem
  const itemsMap = useMemo(() => {
    const map = new Map<string, BacklogItem>();
    backlogItems.forEach(item => map.set(item.id, item));
    return map;
  }, [backlogItems]);

  // Convert ranking-store tiers to TierListTier format for rendering
  const tiers = useMemo((): TierListTier[] => {
    return tierState.tiers.map(tier => ({
      id: tier.id,
      label: tier.label,
      displayName: tier.displayName,
      description: tier.description,
      color: tier.color,
      items: tier.itemIds, // itemIds from store maps to items in TierListTier
      collapsed: tier.collapsed,
    }));
  }, [tierState.tiers]);

  // Get unranked items from store + any backlog items not yet placed
  const unrankedItems = useMemo(() => {
    // Items explicitly in unranked pool
    const unrankedFromStore = tierState.unrankedItemIds
      .map(id => itemsMap.get(id))
      .filter((item): item is BacklogItem => !!item);

    // Items from backlog not in any tier and not in unranked pool
    const tieredIds = new Set(tierState.tiers.flatMap(t => t.itemIds));
    const unrankedIds = new Set(tierState.unrankedItemIds);
    const usedInGridIds = new Set(
      gridItems
        .filter(item => item.matched && item.backlogItemId)
        .map(item => item.backlogItemId)
    );

    const notPlacedYet = backlogItems.filter(
      item => !tieredIds.has(item.id) && !unrankedIds.has(item.id) && !usedInGridIds.has(item.id)
    );

    return [...unrankedFromStore, ...notPlacedYet];
  }, [tierState.tiers, tierState.unrankedItemIds, itemsMap, backlogItems, gridItems]);

  // Sync tiers from ranking on mount (when entering tier mode)
  useEffect(() => {
    syncTiersFromRanking();
  }, [syncTiersFromRanking]);

  // Handle preset change
  const handlePresetChange = useCallback((newPreset: TierListPreset) => {
    setPreset(newPreset);
    // Note: Preset change is UI-only for now. The store tier config would need updating.
    // For now we just update the local preset state for visual customization.
  }, []);

  // Handle tier update (visual updates like custom labels/colors)
  const handleTierUpdate = useCallback((tierId: string, updates: Partial<TierListTier>) => {
    // Visual updates are handled locally for now
    // Store tier structure remains unchanged
  }, []);

  // Handle tier toggle collapse
  const handleToggleCollapse = useCallback((tierId: string) => {
    // Toggle collapse is a UI state - could be added to store if needed
    // For now, tiers from store already have collapsed property
  }, []);

  // Handle tier add
  const handleTierAdd = useCallback((tier: TierListTier) => {
    // Adding custom tiers would need store modification
    // This is a visual customization feature
  }, []);

  // Handle tier remove
  const handleTierRemove = useCallback((tierId: string) => {
    // Find the tier and move its items to unranked
    const tierToRemove = tiers.find(t => t.id === tierId);
    if (!tierToRemove) return;

    // Move each item to unranked
    for (const itemId of tierToRemove.items) {
      addToUnranked(itemId);
    }
  }, [tiers, addToUnranked]);

  // Handle remove item from tier - moves item to unranked pool
  const handleRemoveItem = useCallback((itemId: string) => {
    // Find which tier contains this item
    const sourceTier = tiers.find(t => t.items.includes(itemId));
    if (sourceTier) {
      // Move to unranked using store action
      addToUnranked(itemId);
    }
  }, [tiers, addToUnranked]);

  // Handle reset - clear all tiers and move items to unranked
  const handleReset = useCallback(() => {
    // Move all items from all tiers to unranked
    for (const tier of tiers) {
      for (const itemId of tier.items) {
        addToUnranked(itemId);
      }
    }
  }, [tiers, addToUnranked]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!tierListRef.current) return;
    setIsExporting(true);

    try {
      // Get items data for export
      const tiersWithItems = tiers.map(tier => ({
        ...tier,
        itemData: tier.items
          .map(id => itemsMap.get(id))
          .filter((i): i is BacklogItem => !!i),
      }));

      await exportTierListImage(tiersWithItems, {
        title: listTitle,
        width: preset.exportDimensions?.width ?? 1200,
        height: preset.exportDimensions?.height ?? 800,
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [tiers, itemsMap, listTitle, preset.exportDimensions]);

  // Apply ranking - sync tier order to the ranking store
  const handleApplyRanking = useCallback(() => {
    // Build items map from backlog for the store sync
    const transferableMap = new Map(
      backlogItems.map(item => [
        item.id,
        {
          id: item.id,
          title: item.title || item.name || 'Untitled',
          description: item.description,
          image_url: item.image_url,
          tags: item.tags,
          category: item.category,
        },
      ])
    );

    // Sync tier state to ranking (writes tier order to ranking array)
    syncRankingFromTiers(transferableMap);

    // Also call the legacy callback for compatibility with existing flow
    const rankedItems: BacklogItem[] = [];
    for (const tier of tiers) {
      for (const itemId of tier.items) {
        const item = itemsMap.get(itemId);
        if (item) rankedItems.push(item);
      }
    }
    onRankingComplete(rankedItems);
  }, [tiers, itemsMap, backlogItems, onRankingComplete, syncRankingFromTiers]);

  // Get items for a tier
  const getTierItems = useCallback(
    (tier: TierListTier): BacklogItem[] => {
      return tier.items
        .map(id => itemsMap.get(id))
        .filter((i): i is BacklogItem => !!i);
    },
    [itemsMap]
  );

  // Calculate agreement score if community comparison is enabled
  const agreementScore = showCommunityComparison ? 75 : undefined; // Placeholder

  // No DndContext here - parent SimpleMatchGrid provides the DndContext
  return (
    <div className="relative py-4">
      {/* Action buttons - title is in page header */}
      <div className="flex items-center justify-end gap-2 mb-4 flex-wrap">
        {/* Community comparison toggle */}
        <CommunityComparisonToggle
          enabled={showCommunityComparison}
          onToggle={() => setShowCommunityComparison(!showCommunityComparison)}
          agreementScore={agreementScore}
        />

        {/* Customize button */}
        <TierConfigurator
          currentPreset={preset}
          tiers={tiers}
          onPresetChange={handlePresetChange}
          onTierUpdate={handleTierUpdate}
          onTierAdd={handleTierAdd}
          onTierRemove={handleTierRemove}
          onTiersReset={handleReset}
          onExport={handleExport}
        />

        {/* Apply ranking button */}
        <button
          onClick={handleApplyRanking}
          disabled={tiers.every(t => t.items.length === 0)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all text-sm"
        >
          Apply Ranking
        </button>
      </div>

      {/* Tier list */}
      <div ref={tierListRef} className="space-y-2">
        <AnimatePresence mode="popLayout">
          {tiers.map((tier) => (
            <TierRow
              key={tier.id}
              tier={tier}
              items={getTierItems(tier)}
              onToggleCollapse={handleToggleCollapse}
              onRemoveItem={handleRemoveItem}
              onEditTier={(t) => handleTierUpdate(t.id, t)}
              showCommunityComparison={showCommunityComparison}
              isDraggingOver={isDragging}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Unranked pool */}
      <UnrankedPool items={unrankedItems} />

      {/* Export loading overlay */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Generating image...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TierListView;
