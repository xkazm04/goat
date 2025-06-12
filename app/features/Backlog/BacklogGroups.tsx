"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useCurrentList } from "@/app/stores/use-list-store";
import { useItemGroups } from "@/app/hooks/use-item-groups";
import { useSessionStore } from "@/app/stores/session-store";
import { useBacklogFiltering } from "@/app/hooks/use-backlog-filtering";
import { useGroupItemLoading } from "@/app/hooks/use-group-item-loading";
import { BacklogDataProcessor } from "./BacklogGroups/backlog-data-processor";
import SidebarContent from "./BacklogGroups/SidebarContent";

interface BacklogGroupsProps {
  className?: string;
  isModal?: boolean;
  expandedViewMode?: 'grid' | 'list';
  onCloseModal?: () => void;
  onOpenModal?: () => void; // ADD THIS
}

export function BacklogGroups({ 
  className, 
  isModal = false, 
  expandedViewMode: propExpandedViewMode, 
  onCloseModal,
  onOpenModal // ADD THIS
}: BacklogGroupsProps) {
  const currentList = useCurrentList();
  const { 
    backlogGroups: storeGroups, 
    removeItemFromGroup,
    setBacklogGroups 
  } = useSessionStore();

  // Local state for UI
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditorsPickOnly, setShowEditorsPickOnly] = useState(false);
  const [localIsExpandedView, setIsExpandedView] = useState(false);
  const [localExpandedViewMode, setLocalExpandedViewMode] = useState<'grid' | 'list'>('list');

  // Group item loading
  const { loadGroupItems, isGroupLoaded, isGroupLoading } = useGroupItemLoading();

  // STABLE REFS - Don't change on re-renders
  const autoLoadedGroupsRef = useRef(new Set<string>());
  const initialAutoLoadDoneRef = useRef(false);
  const currentListIdRef = useRef<string | null>(null);

  // Fetch API groups with proper error handling
  const { 
    data: apiGroups = [], 
    isLoading: apiLoading, 
    error: apiError,
    refetch: refetchGroups 
  } = useItemGroups(
    currentList?.category || 'sports',
    currentList?.subcategory,
    { enabled: !!currentList }
  );

  // SAFE TYPE GUARD for store groups
  const safeStoreGroups = useMemo(() => {
    if (!Array.isArray(storeGroups)) {
      console.warn('⚠️ storeGroups is not an array:', typeof storeGroups, storeGroups);
      return [];
    }
    return storeGroups;
  }, [storeGroups]);

  // Process groups: merge API structure with store data
  const processedGroups = useMemo(() => {
    if (!apiGroups?.length) {
      return BacklogDataProcessor.convertLegacyGroups(safeStoreGroups);
    }
    
    const processed = BacklogDataProcessor.processApiGroups(apiGroups, safeStoreGroups);
    console.log('🔧 Processed groups:', {
      total: processed.length,
      withItems: processed.filter(g => g.items.length > 0).length,
      apiGroupsCount: apiGroups.length,
      storeGroupsCount: safeStoreGroups.length
    });
    
    return processed;
  }, [apiGroups, safeStoreGroups]);

  // Update session store when API groups are loaded (one-time sync)
  useEffect(() => {
    if (processedGroups.length > 0 && safeStoreGroups.length === 0) {
      console.log('🔄 Syncing API groups to session store...');
      setBacklogGroups(processedGroups);
    }
  }, [processedGroups.length, safeStoreGroups.length, setBacklogGroups]);

  // FIXED: Reset tracking only when list actually changes
  useEffect(() => {
    if (currentList?.id !== currentListIdRef.current) {
      console.log(`🔄 List changed from ${currentListIdRef.current} to ${currentList?.id} - resetting auto-load tracking`);
      autoLoadedGroupsRef.current.clear();
      initialAutoLoadDoneRef.current = false;
      currentListIdRef.current = currentList?.id || null;
    }
  }, [currentList?.id]);

  // FIXED: Initial auto-load with stable dependencies
  useEffect(() => {
    // Only run if we have groups, not loading, have a list, and haven't done initial load
    if (
      processedGroups.length > 0 && 
      !apiLoading && 
      currentList?.id && 
      !initialAutoLoadDoneRef.current &&
      currentList.id === currentListIdRef.current 
    ) {
      const unloadedGroups = processedGroups
        .filter(group => 
          group.item_count > 0 && 
          !isGroupLoaded(group.id) && 
          !autoLoadedGroupsRef.current.has(group.id)
        )
        .slice(0, 3);

      if (unloadedGroups.length > 0) {
        console.log(`🎯 ONE-TIME auto-loading for ${unloadedGroups.length} groups...`);
        initialAutoLoadDoneRef.current = true;

        unloadedGroups.forEach(async (group, index) => {
          autoLoadedGroupsRef.current.add(group.id);
          
          setTimeout(async () => {
            try {
              console.log(`📦 Auto-loading: ${group.name} (${group.item_count} items)`);
              await loadGroupItems(group.id);
            } catch (error) {
              console.warn(`Failed to auto-load ${group.name}:`, error);
              autoLoadedGroupsRef.current.delete(group.id);
            }
          }, index * 200);
        });
      } else {
        initialAutoLoadDoneRef.current = true;
      }
    }
  }, [
    // STABLE dependencies only
    processedGroups.length,
    apiLoading,
    currentList?.id
    // REMOVED: any hook functions or changing values
  ]);

  // Use prop or local state for expanded view mode
  const expandedViewMode = propExpandedViewMode || localExpandedViewMode;
  const setExpandedViewMode = propExpandedViewMode ? () => {} : setLocalExpandedViewMode;

  // Force expanded view if modal
  const isExpandedView = isModal || localIsExpandedView;

  // Apply filtering with better performance
  const { processedGroups: filteredGroups, filterStats } = useBacklogFiltering(
    processedGroups,
    searchTerm,
    showEditorsPickOnly,
    setShowEditorsPickOnly
  );

  // Handle item removal
  const handleRemoveItem = useCallback((groupId: string, itemId: string) => {
    console.log(`🗑️ Removing item ${itemId} from group ${groupId}`);
    removeItemFromGroup(groupId, itemId);
  }, [removeItemFromGroup]);

  // FIXED: Handle group expansion - no side effects
  const handleGroupExpand = useCallback(async (groupId: string) => {
    const group = processedGroups.find(g => g.id === groupId);
    if (!group) {
      console.warn(`⚠️ Group ${groupId} not found`);
      return;
    }

    if (group.item_count > 0 && !isGroupLoaded(groupId) && !isGroupLoading(groupId)) {
      try {
        console.log(`🔄 Loading items for expanded group: ${group.name}`);
        await loadGroupItems(groupId);
      } catch (error) {
        console.error(`❌ Failed to load items for group ${group.name}:`, error);
      }
    }
  }, [processedGroups, isGroupLoaded, isGroupLoading, loadGroupItems]);

  if (!currentList) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">No list selected</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <SidebarContent
        isExpandedView={isExpandedView}
        isModal={isModal}
        filteredGroups={filteredGroups}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isLoading={apiLoading}
        backlogGroups={processedGroups}
        showEditorsPickOnly={showEditorsPickOnly}
        onToggleEditorsPick={() => setShowEditorsPickOnly(!showEditorsPickOnly)}
        filteredItemsCount={filterStats.filteredItemsCount}
        hasActiveFilters={filterStats.hasActiveFilters}
        onClearFilters={() => {
          setSearchTerm("");
          setShowEditorsPickOnly(false);
        }}
        totalItems={processedGroups.reduce((acc, group) => acc + group.items.length, 0)}
        apiTotalItems={apiGroups.reduce((acc, group) => acc + (group.item_count || 0), 0)}
        setIsExpanded={setIsExpandedView}
        expandedViewMode={expandedViewMode}
        setExpandedViewMode={setExpandedViewMode}
        currentList={currentList}
        isMobile={false}
        error={apiError}
        onRefresh={() => {
          autoLoadedGroupsRef.current.clear();
          initialAutoLoadDoneRef.current = false;
          refetchGroups();
        }}
        onRemoveItem={handleRemoveItem}
        onGroupExpand={handleGroupExpand}
        onOpenModal={onOpenModal} // ADD THIS
        onCloseModal={onCloseModal}
      />
    </div>
  );
}