"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useBacklogStore } from "@/app/stores/backlog-store";
import { useCurrentList } from "@/app/stores/use-list-store";
import React from "react";
import SidebarContent from "./BacklogGroups/SidebarContent";
import { ErrorState, LoadingState } from "./BacklogGroupStates";
import { Eye } from "lucide-react";

interface BacklogGroupsProps {
  className?: string;
}

export function BacklogGroups({ className }: BacklogGroupsProps) {
  const groups = useBacklogStore(state => state.groups);
  const isLoading = useBacklogStore(state => state.isLoading);
  const error = useBacklogStore(state => state.error);
  const searchTerm = useBacklogStore(state => state.searchTerm);
  const loadingGroupIds = useBacklogStore(state => state.loadingGroupIds);
  const loadingProgress = useBacklogStore(state => state.loadingProgress);
  const cache = useBacklogStore(state => state.cache);

  // Store actions
  const {
    initializeGroups,
    loadGroupItems,
    searchGroups,
    filterGroupsByCategory,
    setSearchTerm
  } = useBacklogStore();

  const currentList = useCurrentList();

  // UI state only - no data state management
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true); 
  const [expandedViewMode, setExpandedViewMode] = useState<'grid' | 'list'>('list');
  const [isInitialized, setIsInitialized] = useState(false);

  // Debug logging for groups
  useEffect(() => {
    if (groups && groups.length > 0) {
      const firstGroup = groups[0];
      const groupWithItems = groups.find(g => g.items && g.items.length > 0);

      console.log(`🔍 Groups state:`, {
        totalGroups: groups.length,
        groupsWithItems: groups.filter(g => g.items && g.items.length > 0).length,
        loadingProgress: loadingProgress,
        sampleGroup: firstGroup ? {
          id: firstGroup.id,
          name: firstGroup.name,
          itemCount: firstGroup.item_count || 0,
          hasItems: !!(firstGroup.items && firstGroup.items.length > 0),
        } : null,
        sampleItem: groupWithItems?.items?.[0] ? {
          id: groupWithItems.items[0].id,
          title: groupWithItems.items[0].title || groupWithItems.items[0].name,
          hasImageUrl: !!groupWithItems.items[0].image_url,
        } : null
      });
    }
  }, [groups, loadingProgress]);

  const initializeBacklogData = useCallback(async (forceRefresh = false) => {
    if (!currentList?.category) {
      console.log('❌ No current list category, skipping initialization');
      return;
    }

    try {
      await initializeGroups(currentList.category, currentList.subcategory, forceRefresh);
    } catch (error) {
      console.error('❌ Failed to initialize backlog:', error);
    }
  }, [currentList?.category, currentList?.subcategory, initializeGroups]);

  // SIMPLIFIED: Category change handler
  useEffect(() => {
    if (!currentList?.category) return;

    const cacheKey = `${currentList.category}-${currentList.subcategory || ''}`;
    const cachedData = cache[cacheKey];
    
    // Determine if we need to initialize
    const needsInitialization = 
      !isInitialized || 
      !cachedData || 
      !cachedData.groups || 
      cachedData.groups.length === 0;

    if (needsInitialization) {
      console.log(`🔄 Category changed or needs initialization: ${cacheKey}`);
      initializeBacklogData(true);
      setIsInitialized(true);
    } else {
      console.log(`✅ Using cached data for: ${cacheKey}`);
      setIsInitialized(true);
    }
  }, [currentList?.category, currentList?.subcategory, isInitialized, cache, initializeBacklogData]);

  const filteredGroups = useMemo(() => {
    if (!currentList?.category) {
      console.log('No current list category for filtering');
      return [];
    }

    let result = [];

    if (searchTerm?.trim()) {
      // Search and filter by category
      const searchResults = searchGroups(searchTerm);
      result = searchResults.filter(group => {
        const matchesCategory = group.category === currentList.category;
        const matchesSubcategory = !currentList.subcategory || group.subcategory === currentList.subcategory;
        return matchesCategory && matchesSubcategory;
      });
    } else {
      result = filterGroupsByCategory(currentList.category, currentList.subcategory);
      console.log(`📂 Category filter results: ${result.length} groups`);
    }

    return result;
  }, [
    currentList?.category,
    currentList?.subcategory,
    searchTerm,
    groups.length, // Trigger when groups change
    searchGroups,
    filterGroupsByCategory
  ]);

  // SIMPLIFIED: Total items calculation
  const totalItems = useMemo(() => {
    return filteredGroups.reduce((sum, group) => sum + (group.item_count || 0), 0);
  }, [filteredGroups]);

  const loadedGroupIds = useMemo(() => {
    const loaded = new Set<string>();
    filteredGroups.forEach(group => {
      if (group.items && group.items.length > 0) {
        loaded.add(group.id);
      }
    });
    return loaded;
  }, [filteredGroups]);

  const handleGroupHover = useCallback(async (groupId: string) => {
    if (isExpanded) return;
    if (loadedGroupIds.has(groupId) || loadingGroupIds.has(groupId)) {
      return;
    }
    await loadGroupItems(groupId);
  }, [isExpanded, loadedGroupIds, loadingGroupIds, loadGroupItems]);

  const handleGroupExpand = useCallback(async (groupId: string) => {
    if (!loadedGroupIds.has(groupId) && !loadingGroupIds.has(groupId)) {
      console.log(`📖 Loading items for group ${groupId} on expand`);
      await loadGroupItems(groupId);
    }
  }, [loadedGroupIds, loadingGroupIds, loadGroupItems]);

  const handleExpandedBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  }, []);

  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isExpanded]);

  const handleRetry = useCallback(() => {
    initializeBacklogData(true);
  }, [initializeBacklogData]);

  const handleToggleVisibility = useCallback(() => {
    setIsVisible(!isVisible);
  }, [isVisible]);

  const handleToggleExpansion = useCallback(() => {
      setIsExpanded(!isExpanded);
  }, [isExpanded]);

  
  if (error && filteredGroups.length === 0 && !isLoading) {
    return (
      <ErrorState
        className={className}
        onRetry={handleRetry}
        error={error}
      />
    );
  }

  // Loading state - only show if loading and no groups
  if (isLoading && filteredGroups.length === 0) {
    return (
      <LoadingState
        currentList={currentList}
        className={className}
      />
    );
  }

  return (
    <>
      {/* Toggle Button  */}
      <motion.button
        onClick={handleToggleVisibility}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2 rounded-xl transition-all duration-200 hover:bg-slate-700/50 absolute -top-12 right-0"
        title={isVisible ? "Hide backlog collection" : "Show backlog collection"}
        style={{
          background: isVisible ? 'rgba(59, 130, 246, 0.1)' : 'rgba(71, 85, 105, 0.2)',
          border: `1px solid ${isVisible ? 'rgba(59, 130, 246, 0.3)' : 'rgba(71, 85, 105, 0.3)'}`
        }}
      >
        <Eye className={`w-5 h-5 transition-colors ${
          isVisible ? 'text-blue-400' : 'text-slate-500'
        }`} />
        
        {/* Notification dot for hidden state with data */}
        {!isVisible && groups.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-800"
          />
        )}
      </motion.button>

      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div 
            className={className}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <SidebarContent
              isExpandedView={false}
              filteredGroups={filteredGroups}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              isLoading={isLoading}
              backlogGroups={groups}
              currentList={currentList}
              totalItems={totalItems}
              apiTotalItems={totalItems}
              expandedViewMode={expandedViewMode}
              setIsExpanded={handleToggleExpansion}
              onGroupHover={handleGroupHover}
              onGroupExpand={handleGroupExpand}
              loadingGroups={loadingGroupIds}
              loadedGroups={loadedGroupIds}
              loadingProgress={loadingProgress}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6
            `}
            onClick={handleExpandedBackdropClick}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              className={`w-full max-w-7xl h-[95vh] rounded-3xl overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent
                isExpandedView={true}
                filteredGroups={filteredGroups}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isLoading={isLoading}
                backlogGroups={groups}
                currentList={currentList}
                totalItems={totalItems}
                apiTotalItems={totalItems}
                expandedViewMode={expandedViewMode}
                setIsExpanded={setIsExpanded}
                onGroupHover={handleGroupHover}
                onGroupExpand={handleGroupExpand}
                loadingGroups={loadingGroupIds}
                loadedGroups={loadedGroupIds}
                loadingProgress={loadingProgress}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}