"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Download, Eye, EyeOff, Share2, Users } from 'lucide-react';
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

interface TierListViewProps {
  gridItems: GridItemType[];
  backlogItems: BacklogItem[];
  onRankingComplete: (ranking: BacklogItem[]) => void;
  listSize: number;
  listTitle?: string;
}

/**
 * Drag overlay for item being dragged
 */
function DragOverlayItem({ item }: { item: BacklogItem }) {
  const title = item.title || item.name || 'Unknown';

  return (
    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/30 scale-110 border-2 border-cyan-400/50">
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
          <span className="text-2xl font-bold text-slate-500">
            {title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
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
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        transition-colors
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
 */
export function TierListView({
  gridItems,
  backlogItems,
  onRankingComplete,
  listSize,
  listTitle = 'Tier List',
}: TierListViewProps) {
  // State
  const [preset, setPreset] = useState<TierListPreset>(PRESET_CLASSIC);
  const [tiers, setTiers] = useState<TierListTier[]>(() =>
    PRESET_CLASSIC.tiers.map(t => ({ ...t, items: [] }))
  );
  const [unrankedItems, setUnrankedItems] = useState<BacklogItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCommunityComparison, setShowCommunityComparison] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const tierListRef = useRef<HTMLDivElement>(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Map of item ID to BacklogItem
  const itemsMap = useMemo(() => {
    const map = new Map<string, BacklogItem>();
    backlogItems.forEach(item => map.set(item.id, item));
    return map;
  }, [backlogItems]);

  // Initialize unranked items from backlog
  useEffect(() => {
    // Get items already in tiers
    const tieredIds = new Set(tiers.flatMap(t => t.items));

    // Get items already used in grid
    const usedIds = new Set(
      gridItems
        .filter(item => item.matched && item.backlogItemId)
        .map(item => item.backlogItemId)
    );

    // Set unranked as backlog items not in tiers and not used
    const unranked = backlogItems.filter(
      item => !tieredIds.has(item.id) && !usedIds.has(item.id)
    );
    setUnrankedItems(unranked);
  }, [backlogItems, gridItems, tiers]);

  // Get active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return itemsMap.get(activeId) || unrankedItems.find(i => i.id === activeId);
  }, [activeId, itemsMap, unrankedItems]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag over (for showing drop previews)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Could add preview logic here
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Find source tier/pool
      const sourceTierIndex = tiers.findIndex(t => t.items.includes(activeId));
      const isFromUnranked = unrankedItems.some(i => i.id === activeId);

      // Determine destination
      const isDropOnTier = overId.startsWith('tier-');
      const destTierId = isDropOnTier
        ? overId.replace('tier-', '')
        : over.data?.current?.tierId;
      const destTierIndex = tiers.findIndex(t => t.id === destTierId);
      const isDropOnUnranked = overId === 'unranked-pool';

      // Handle different cases
      if (isDropOnUnranked && !isFromUnranked) {
        // Move from tier to unranked
        const newTiers = [...tiers];
        newTiers[sourceTierIndex] = {
          ...newTiers[sourceTierIndex],
          items: newTiers[sourceTierIndex].items.filter(id => id !== activeId),
        };
        setTiers(newTiers);

        const item = itemsMap.get(activeId);
        if (item) {
          setUnrankedItems(prev => [...prev, item]);
        }
      } else if (destTierIndex !== -1) {
        if (isFromUnranked) {
          // Move from unranked to tier
          setUnrankedItems(prev => prev.filter(i => i.id !== activeId));

          const newTiers = [...tiers];
          newTiers[destTierIndex] = {
            ...newTiers[destTierIndex],
            items: [...newTiers[destTierIndex].items, activeId],
          };
          setTiers(newTiers);
        } else if (sourceTierIndex === destTierIndex) {
          // Reorder within same tier
          const tier = tiers[sourceTierIndex];
          const oldIndex = tier.items.indexOf(activeId);

          // Find drop position
          let newIndex = tier.items.length - 1;
          if (over.data?.current?.type === 'tier-item') {
            newIndex = tier.items.indexOf(overId);
          }

          if (oldIndex !== newIndex && oldIndex !== -1) {
            const newTiers = [...tiers];
            newTiers[sourceTierIndex] = {
              ...newTiers[sourceTierIndex],
              items: arrayMove(tier.items, oldIndex, newIndex),
            };
            setTiers(newTiers);
          }
        } else {
          // Move between tiers
          const newTiers = [...tiers];

          // Remove from source
          newTiers[sourceTierIndex] = {
            ...newTiers[sourceTierIndex],
            items: newTiers[sourceTierIndex].items.filter(id => id !== activeId),
          };

          // Add to destination
          newTiers[destTierIndex] = {
            ...newTiers[destTierIndex],
            items: [...newTiers[destTierIndex].items, activeId],
          };

          setTiers(newTiers);
        }
      }
    },
    [tiers, unrankedItems, itemsMap]
  );

  // Handle preset change
  const handlePresetChange = useCallback((newPreset: TierListPreset) => {
    setPreset(newPreset);
    // Transfer items to new tier structure
    const allItems = tiers.flatMap(t => t.items);
    const newTiers = newPreset.tiers.map((t, index) => ({
      ...t,
      items: index === 0 ? allItems : [], // Put all items in first tier temporarily
    }));
    setTiers(newTiers);
  }, [tiers]);

  // Handle tier update
  const handleTierUpdate = useCallback((tierId: string, updates: Partial<TierListTier>) => {
    setTiers(prev =>
      prev.map(t => (t.id === tierId ? { ...t, ...updates } : t))
    );
  }, []);

  // Handle tier toggle collapse
  const handleToggleCollapse = useCallback((tierId: string) => {
    setTiers(prev =>
      prev.map(t =>
        t.id === tierId ? { ...t, collapsed: !t.collapsed } : t
      )
    );
  }, []);

  // Handle tier add
  const handleTierAdd = useCallback((tier: TierListTier) => {
    setTiers(prev => [...prev, tier]);
  }, []);

  // Handle tier remove
  const handleTierRemove = useCallback((tierId: string) => {
    setTiers(prev => {
      const tierToRemove = prev.find(t => t.id === tierId);
      if (!tierToRemove) return prev;

      // Move items to unranked
      const itemsToMove = tierToRemove.items;
      if (itemsToMove.length > 0) {
        const items = itemsToMove
          .map(id => itemsMap.get(id))
          .filter((i): i is BacklogItem => !!i);
        setUnrankedItems(current => [...current, ...items]);
      }

      return prev.filter(t => t.id !== tierId);
    });
  }, [itemsMap]);

  // Handle remove item from tier
  const handleRemoveItem = useCallback((itemId: string) => {
    setTiers(prev =>
      prev.map(t => ({
        ...t,
        items: t.items.filter(id => id !== itemId),
      }))
    );

    const item = itemsMap.get(itemId);
    if (item) {
      setUnrankedItems(prev => [...prev, item]);
    }
  }, [itemsMap]);

  // Handle reset
  const handleReset = useCallback(() => {
    const newTiers = preset.tiers.map(t => ({ ...t, items: [] }));
    setTiers(newTiers);
    setUnrankedItems(backlogItems);
  }, [preset, backlogItems]);

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
        width: preset.exportDimensions.width,
        height: preset.exportDimensions.height,
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [tiers, itemsMap, listTitle, preset.exportDimensions]);

  // Apply ranking to grid
  const handleApplyRanking = useCallback(() => {
    const ranking = tierListToRanking(tiers);
    const rankedItems: BacklogItem[] = [];

    // Get items in order
    for (const tier of tiers) {
      for (const itemId of tier.items) {
        const item = itemsMap.get(itemId);
        if (item) rankedItems.push(item);
      }
    }

    onRankingComplete(rankedItems);
  }, [tiers, itemsMap, onRankingComplete]);

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="relative py-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-white">{listTitle}</h2>
            <p className="text-sm text-slate-400">
              Drag items to rank them in tiers
            </p>
          </div>

          <div className="flex items-center gap-2">
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
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Unranked pool */}
        <UnrankedPool items={unrankedItems} />

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeItem && <DragOverlayItem item={activeItem} />}
        </DragOverlay>

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
    </DndContext>
  );
}

export default TierListView;
