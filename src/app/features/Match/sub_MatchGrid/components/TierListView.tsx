"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Sparkles } from 'lucide-react';
import { GridItemType } from '@/types/match';
import { BacklogItem } from '@/types/backlog-groups';
import {
  TierListTier,
  TierListPreset,
  PRESET_CLASSIC,
} from '../../lib/tierPresets';
import { TierRow } from './TierRow';
import { TierConfigurator } from './TierConfigurator';
import { DebatePanel } from './Debate/DebatePanel';
import { exportTierListImage } from '../../lib/tierListExporter';
import { useRankingStore } from '@/stores/ranking-store';
import { useDebateStore } from '@/stores/debate-store';
import { useDebate } from '@/hooks/use-debate';
import { useCurrentListInfo } from '@/stores/use-list-store';
import { extractTitle } from '@/lib/items/item-utils';
import { useOptionalDropZoneHighlight } from './DropZoneHighlightContext';
import { TierFocusProvider, useTierFocus } from './TierFocusProvider';
import {
  ScreenReaderAnnouncer,
  SkipLinks,
  TierInstructions,
} from './ScreenReaderAnnouncer';
import {
  KeyboardShortcutsPanel,
  KeyboardModeIndicator,
} from './KeyboardShortcutsPanel';
import { useTierKeyboardNavigation } from '../hooks/useTierKeyboardNavigation';
import { useTierItemGroups } from '../hooks/useTierItemGroups';

interface TierListViewProps {
  gridItems: GridItemType[];
  backlogItems: BacklogItem[];
  onRankingComplete: (ranking: BacklogItem[]) => void;
  listSize: number;
  listTitle?: string;
}

/**
 * Main Tier List View Component
 *
 * Now uses ranking-store for tier state instead of local useState.
 * DnD is handled by parent SimpleMatchGrid's DndContext.
 * Includes comprehensive keyboard navigation and accessibility.
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
  const [isExporting, setIsExporting] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

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

  // Compute tier-item groupings with reference-stable memoization
  const { itemsMap, tiers, unrankedItems, tierItemsMap } = useTierItemGroups({
    backlogItems,
    gridItems,
    tierState,
  });

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

  // Get items for a tier (uses pre-computed tierItemsMap)
  const getTierItems = useCallback(
    (tier: TierListTier): BacklogItem[] => {
      return tierItemsMap.get(tier.id) || [];
    },
    [tierItemsMap]
  );

  // No DndContext here - parent SimpleMatchGrid provides the DndContext
  // Wrap with TierFocusProvider for keyboard navigation
  return (
    <TierFocusProvider initialTiers={tiers}>
      <TierListViewContent
        tiers={tiers}
        tierItemsMap={tierItemsMap}
        unrankedItems={unrankedItems}
        itemsMap={itemsMap}
        preset={preset}
        isDragging={isDragging}
        isExporting={isExporting}
        showKeyboardHelp={showKeyboardHelp}
        listTitle={listTitle}
        listSize={listSize}
        tierListRef={tierListRef}
        onPresetChange={handlePresetChange}
        onTierUpdate={handleTierUpdate}
        onTierAdd={handleTierAdd}
        onTierRemove={handleTierRemove}
        onReset={handleReset}
        onExport={handleExport}
        onToggleCollapse={handleToggleCollapse}
        onRemoveItem={handleRemoveItem}
        onToggleKeyboardHelp={() => setShowKeyboardHelp(!showKeyboardHelp)}
        getTierItems={getTierItems}
      />
    </TierFocusProvider>
  );
}

/**
 * Inner content component that uses the TierFocusProvider context
 */
interface TierListViewContentProps {
  tiers: TierListTier[];
  tierItemsMap: Map<string, BacklogItem[]>;
  unrankedItems: BacklogItem[];
  itemsMap: Map<string, BacklogItem>;
  preset: TierListPreset;
  isDragging: boolean;
  isExporting: boolean;
  showKeyboardHelp: boolean;
  listTitle: string;
  listSize: number;
  tierListRef: React.RefObject<HTMLDivElement | null>;
  onPresetChange: (preset: TierListPreset) => void;
  onTierUpdate: (tierId: string, updates: Partial<TierListTier>) => void;
  onTierAdd: (tier: TierListTier) => void;
  onTierRemove: (tierId: string) => void;
  onReset: () => void;
  onExport: () => void;
  onToggleCollapse: (tierId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onToggleKeyboardHelp: () => void;
  getTierItems: (tier: TierListTier) => BacklogItem[];
}

function TierListViewContent({
  tiers,
  tierItemsMap,
  unrankedItems,
  itemsMap,
  preset,
  isDragging,
  isExporting,
  showKeyboardHelp,
  listTitle,
  listSize,
  tierListRef,
  onPresetChange,
  onTierUpdate,
  onTierAdd,
  onTierRemove,
  onReset,
  onExport,
  onToggleCollapse,
  onRemoveItem,
  onToggleKeyboardHelp,
  getTierItems,
}: TierListViewContentProps) {
  // Access focus context
  const {
    setTiers,
    setTierItems,
    setUnrankedItems,
    focusTier,
    focusUnrankedPool,
  } = useTierFocus();

  // AI Debate Mode
  const listInfo = useCurrentListInfo();
  const debateEnabled = useDebateStore(s => s.enabled);
  const debateThreads = useDebateStore(s => s.threads);
  const {
    activeThread,
    panelOpen,
    isLoading: debateLoading,
    setEnabled: setDebateEnabled,
    challengePlacement,
    replyToDebate,
    resolveDebate,
    setActiveThread,
    setPanelOpen,
    getControversy,
  } = useDebate({
    category: listInfo?.category || 'General',
    subcategory: listInfo?.subcategory,
    listSize,
  });

  // Build per-item debate info map for TierRow
  const debateInfoMap = useMemo(() => {
    if (!debateEnabled) return undefined;
    const map = new Map<string, { score: number; isHotTake: boolean; hasDebate: boolean }>();
    for (const [itemId, thread] of Object.entries(debateThreads)) {
      map.set(itemId, {
        score: thread.controversyScore,
        isHotTake: thread.isHotTake,
        hasDebate: thread.messages.length > 0,
      });
    }
    return map;
  }, [debateEnabled, debateThreads]);

  // Handle debate trigger from a tier item
  const handleDebateItem = useCallback((itemId: string, itemName: string, tierId: string) => {
    // Gather context: tiermates, items above/below
    const tier = tiers.find(t => t.id === tierId);
    const tierItems = tier ? (tierItemsMap.get(tier.id) || []) : [];
    const tierLabel = tier?.customLabel || tier?.label || '?';

    const tierIndex = tiers.findIndex(t => t.id === tierId);
    const tiermates = tierItems
      .filter(i => i.id !== itemId)
      .map(i => i.title || i.name || 'Unknown')
      .slice(0, 5);

    const rankedAbove = tiers
      .slice(0, tierIndex)
      .flatMap(t => (tierItemsMap.get(t.id) || []).map(i => i.title || i.name || 'Unknown'))
      .slice(0, 5);

    const rankedBelow = tiers
      .slice(tierIndex + 1)
      .flatMap(t => (tierItemsMap.get(t.id) || []).map(i => i.title || i.name || 'Unknown'))
      .slice(0, 5);

    // Count position (1-based) across all tiers
    let position = 1;
    for (const t of tiers) {
      const items = tierItemsMap.get(t.id) || [];
      if (t.id === tierId) {
        const idx = items.findIndex(i => i.id === itemId);
        position += idx >= 0 ? idx : 0;
        break;
      }
      position += items.length;
    }

    challengePlacement(itemId, itemName, tierLabel, position, {
      tiermates,
      rankedAbove,
      rankedBelow,
    });
  }, [tiers, tierItemsMap, challengePlacement]);

  const handleDebateAccept = useCallback(() => {
    if (activeThread) resolveDebate(activeThread.id, 'accepted');
  }, [activeThread, resolveDebate]);

  const handleDebateDismiss = useCallback(() => {
    if (activeThread) resolveDebate(activeThread.id, 'dismissed');
  }, [activeThread, resolveDebate]);

  const handleDebateClose = useCallback(() => {
    setPanelOpen(false);
    setActiveThread(null);
  }, [setPanelOpen, setActiveThread]);

  // Sync tier data with focus provider
  useEffect(() => {
    setTiers(tiers);
    setTierItems(tierItemsMap);
    setUnrankedItems(unrankedItems);
  }, [tiers, tierItemsMap, unrankedItems, setTiers, setTierItems, setUnrankedItems]);

  // Handle item detail open (placeholder for future implementation)
  const handleOpenItemDetail = useCallback((item: BacklogItem) => {
    // Could open a detail modal here
    console.log('Open item detail:', item.title);
  }, []);

  // Keyboard navigation hook
  const { isKeyboardNavigating } = useTierKeyboardNavigation({
    enabled: true,
    onShowHelp: onToggleKeyboardHelp,
    onOpenItemDetail: handleOpenItemDetail,
    onEscape: () => {
      if (showKeyboardHelp) {
        onToggleKeyboardHelp();
      }
    },
  });

  // Stable callback for onEditTier — avoids inline arrow in render
  const handleEditTier = useCallback((tier: TierListTier) => {
    onTierUpdate(tier.id, tier);
  }, [onTierUpdate]);

  // Skip link handlers
  const handleSkipToTier = useCallback((tierId: string) => {
    focusTier(tierId);
  }, [focusTier]);

  const handleSkipToUnranked = useCallback(() => {
    focusUnrankedPool();
  }, [focusUnrankedPool]);

  return (
    <div
      className="relative py-4"
      role="application"
      aria-label="Tier list ranking"
      aria-describedby="tier-list-instructions"
    >
      {/* Screen reader instructions */}
      <TierInstructions />

      {/* Screen reader announcer */}
      <ScreenReaderAnnouncer />

      {/* Skip links for keyboard users */}
      <SkipLinks
        tiers={tiers.map(t => ({ id: t.id, label: t.customLabel || t.label }))}
        onSkipToTier={handleSkipToTier}
        onSkipToUnranked={handleSkipToUnranked}
      />
      {/* Action buttons - title is in page header */}
      <div className="flex items-center justify-end gap-2 mb-4 flex-wrap">
        {/* AI Debate Mode toggle */}
        <button
          onClick={() => setDebateEnabled(!debateEnabled)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-control text-sm font-medium
            border transition-all duration-200 focus-ring
            ${debateEnabled
              ? 'bg-brand/20 text-brand border-brand/50 hover:bg-brand/30 shadow-sm shadow-brand/20'
              : 'bg-slate-800/80 text-slate-300 border-slate-600/80 hover:border-slate-500 hover:bg-slate-700/80'
            }`}
          aria-label={debateEnabled ? 'Disable AI Debate Mode' : 'Enable AI Debate Mode'}
          aria-pressed={debateEnabled}
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">AI Debate</span>
        </button>

        {/* Keyboard shortcuts hint */}
        <button
          onClick={onToggleKeyboardHelp}
          className="flex items-center gap-1.5 px-3 py-2 rounded-control text-sm font-medium
            bg-slate-800/80 text-slate-300 border border-slate-600/80
            hover:border-slate-500 hover:bg-slate-700/80
            focus-ring
            transition-all duration-200"
          aria-label="Show keyboard shortcuts (press ? key)"
        >
          <Keyboard className="w-4 h-4" />
          <span className="hidden sm:inline">Shortcuts</span>
          <kbd className="px-1 py-0.5 rounded bg-slate-700 text-2xs font-mono text-slate-400">?</kbd>
        </button>

        {/* Customize button */}
        <TierConfigurator
          currentPreset={preset}
          tiers={tiers}
          onPresetChange={onPresetChange}
          onTierUpdate={onTierUpdate}
          onTierAdd={onTierAdd}
          onTierRemove={onTierRemove}
          onTiersReset={onReset}
          onExport={onExport}
        />
      </div>

      {/* Tier list */}
      <div
        ref={tierListRef}
        className="space-y-2.5"
        role="list"
        aria-label="Tier rows"
      >
        <AnimatePresence mode="popLayout">
          {tiers.map((tier, index) => (
            <TierRow
              key={tier.id}
              tier={tier}
              items={getTierItems(tier)}
              onToggleCollapse={onToggleCollapse}
              onRemoveItem={onRemoveItem}
              onEditTier={handleEditTier}
              isDraggingOver={isDragging}
              tierIndex={index}
              debateInfoMap={debateInfoMap}
              onDebateItem={debateEnabled ? handleDebateItem : undefined}
            />
          ))}
        </AnimatePresence>
      </div>


      {/* Keyboard mode indicator */}
      <KeyboardModeIndicator isActive={isKeyboardNavigating} />

      {/* Keyboard shortcuts help panel */}
      <KeyboardShortcutsPanel
        isOpen={showKeyboardHelp}
        onClose={onToggleKeyboardHelp}
      />

      {/* AI Debate Panel */}
      {debateEnabled && panelOpen && (
        <DebatePanel
          thread={activeThread}
          onReply={replyToDebate}
          onAccept={handleDebateAccept}
          onDismiss={handleDebateDismiss}
          onClose={handleDebateClose}
          isLoading={debateLoading}
        />
      )}

      {/* Export loading overlay */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-modal"
          >
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Generating image...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TierListView;
