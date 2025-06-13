"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useBacklogStore } from "@/app/stores/backlog-store";
import { useCurrentList } from "@/app/stores/use-list-store";
import React from "react";
import SidebarContent from "./BacklogGroups/SidebarContent";
import { ErrorState, LoadingState } from "./BacklogGroupStates";
import { BookOpenIcon } from "lucide-react";

interface BacklogGroupsProps {
  className?: string;
}

export function BacklogGroups({ className }: BacklogGroupsProps) {
  // Get data and actions from the backlog store - avoid using hooks directly in effects
  const storeRef = useRef(useBacklogStore.getState());

  // Set up local state
  const [groups, setGroups] = useState(storeRef.current.groups);
  const [isLoading, setIsLoading] = useState(storeRef.current.isLoading);
  const [error, setError] = useState(storeRef.current.error);
  const [searchTerm, setLocalSearchTerm] = useState(storeRef.current.searchTerm);
  const [loadingGroupIds, setLoadingGroupIds] = useState<Set<string>>(storeRef.current.loadingGroupIds);
  const [cache, setCache] = useState(storeRef.current.cache);
  const [networkStatus, setNetworkStatus] = useState(true);

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = useBacklogStore.subscribe((state) => {
      storeRef.current = state;
      setGroups(state.groups);
      setIsLoading(state.isLoading);
      setError(state.error);
      setLocalSearchTerm(state.searchTerm);
      setLoadingGroupIds(state.loadingGroupIds);
      setCache(state.cache);
    });

    return unsubscribe;
  }, []);

  // Access store actions directly
  const {
    initializeGroups,
    loadGroupItems,
    searchGroups,
    filterGroupsByCategory,
    setSearchTerm,
    setOfflineMode
  } = useBacklogStore.getState();

  const currentList = useCurrentList();

  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedViewMode, setExpandedViewMode] = useState<'grid' | 'list'>('list');
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Track loaded groups for UI
  const [loadedGroupIds, setLoadedGroupIds] = useState<Set<string>>(new Set());

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debug function to log group items structure
  const debugLogItemStructure = useCallback((groupsToLog) => {
    if (!groupsToLog || groupsToLog.length === 0) {
      console.log('No groups to analyze');
      return;
    }

    const firstGroup = groupsToLog[0];
    const sampleItems = firstGroup.items?.slice(0, 2) || [];

    console.log('Group structure:', {
      totalGroups: groupsToLog.length,
      firstGroupId: firstGroup.id,
      firstGroupName: firstGroup.name,
      hasItems: !!firstGroup.items,
      itemsCount: firstGroup.items?.length || 0,
      sampleItem: sampleItems.length > 0 ? {
        id: sampleItems[0].id,
        title: sampleItems[0].title || sampleItems[0].name,
        hasImageUrl: !!sampleItems[0].image_url,
        tags: sampleItems[0].tags
      } : 'No items'
    });
  }, []);

  // New function to help debug image URL issues
  const inspectGroups = useCallback((groups) => {
    if (!groups || groups.length === 0) return;

    const firstGroup = groups[0];
    const groupWithItems = groups.find(g => g.items && g.items.length > 0);

    console.log(`🔍 Groups inspection:`, {
      totalGroups: groups.length,
      groupsWithItems: groups.filter(g => g.items && g.items.length > 0).length,
      sampleGroup: firstGroup ? {
        id: firstGroup.id,
        name: firstGroup.name,
        itemCount: firstGroup.item_count || 0,
        hasItems: !!(firstGroup.items && firstGroup.items.length > 0),
        itemsLength: firstGroup.items ? firstGroup.items.length : 0
      } : 'No groups',
      sampleItemWithImage: groupWithItems && groupWithItems.items && groupWithItems.items.length > 0 ? {
        id: groupWithItems.items[0].id,
        title: groupWithItems.items[0].title || groupWithItems.items[0].name,
        hasImageUrl: !!groupWithItems.items[0].image_url,
        imageUrl: groupWithItems.items[0].image_url || 'NONE'
      } : 'No items with images'
    });
  }, []);

  // Improved initialization function with forced refresh capability
  const fetchBacklogData = useCallback(async (forceRefresh = false) => {
    if (!currentList?.category) return;

    try {
      console.log(`🔄 BacklogGroups: Initializing groups with${forceRefresh ? ' forced' : ''} refresh for category: ${currentList.category}`);
      await initializeGroups(currentList.category, currentList.subcategory, forceRefresh);

      // Reset loaded groups tracking
      setLoadedGroupIds(new Set());
      setIsInitialized(true);

      // Debug log after data is loaded - REMOVED useEffect from here
      debugLogItemStructure(storeRef.current.groups);
    } catch (error) {
      console.error('Failed to initialize groups:', error);
    }
  }, [currentList?.category, currentList?.subcategory, initializeGroups, debugLogItemStructure]);

  // Add this separate useEffect for groups inspection
  useEffect(() => {
    if (groups && groups.length > 0) {
      inspectGroups(groups);
    }
  }, [groups, inspectGroups]);

  // Initialize data when category changes or on component mount
  useEffect(() => {
    if (!currentList?.category || isInitialized) return;

    const cacheKey = `${currentList.category}-${currentList.subcategory || ''}`;
    const cachedData = cache[cacheKey];

    // Check if we need to force refresh (no cache or empty groups)
    const shouldForceRefresh =
      !cachedData ||
      !cachedData.groups ||
      cachedData.groups.length === 0 ||
      groups.length === 0;

    if (shouldForceRefresh) {
      console.log('No cached data found or empty groups, forcing refresh');
      fetchBacklogData(true);
    } else {
      // Regular initialization
      fetchBacklogData(false);
    }

    setIsInitialized(true);
  }, [currentList?.category, currentList?.subcategory, isInitialized, cache, groups.length, fetchBacklogData]);

  // Additional initialization check when groups are empty but not loading
  useEffect(() => {
    if (isInitialized && !isLoading && groups.length === 0 && currentList?.category && !error) {
      console.log('Groups are empty but not loading, triggering fetch');
      fetchBacklogData(true);
    }
  }, [isInitialized, isLoading, groups.length, currentList?.category, error, fetchBacklogData]);

  // Update loaded groups tracking
  useEffect(() => {
    if (groups && groups.length > 0) {
      const newLoadedGroupIds = new Set<string>();

      groups.forEach(group => {
        if (group.items && group.items.length > 0) {
          newLoadedGroupIds.add(group.id);
        }
      });

      setLoadedGroupIds(newLoadedGroupIds);
    }
  }, [groups]);

  // Filter groups based on search term and category
  const filteredGroups = useMemo(() => {
    if (!currentList?.category) return [];

    let result = [];

    if (searchTerm) {
      // Search across all groups and then filter by category
      result = searchGroups(searchTerm).filter(group => {
        const matchesCategory = group.category === currentList.category;
        const matchesSubcategory = !currentList.subcategory || group.subcategory === currentList.subcategory;
        return matchesCategory && matchesSubcategory;
      });
    } else {
      // Just filter by category
      result = filterGroupsByCategory(currentList.category, currentList.subcategory);
    }

    // Log for debugging
    console.log(`Filtered groups: ${result.length} for category ${currentList.category}`);

    return result;
  }, [
    currentList?.category,
    currentList?.subcategory,
    searchTerm,
    searchGroups,
    filterGroupsByCategory
  ]);

  // Calculate total items
  const totalItems = useMemo(() => {
    return filteredGroups.reduce((sum, group) => sum + (group.item_count || 0), 0);
  }, [filteredGroups]);

  const loadedItems = useMemo(() => {
    return filteredGroups.reduce((sum, group) => {
      if (group.items && group.items.length > 0) {
        return sum + group.items.length;
      }
      return sum;
    }, 0);
  }, [filteredGroups]);

  // Handle group interactions
  const handleGroupHover = async (groupId: string) => {
    // Check if this group already has items loaded
    if (loadedGroupIds.has(groupId)) {
      console.log(`Group ${groupId} already has items loaded, skipping`);
      return;
    }

    // Check if this group is already loading
    if (loadingGroupIds.has(groupId)) {
      console.log(`Group ${groupId} is already loading, skipping`);
      return;
    }

    console.log(`Loading items for group ${groupId} on hover`);
    await loadGroupItems(groupId);
  };

  const handleGroupExpand = async (groupId: string) => {
    if (!loadedGroupIds.has(groupId) && !loadingGroupIds.has(groupId)) {
      console.log(`Loading items for group ${groupId} on expand`);
      await loadGroupItems(groupId);
    }
  };

  // Modal backdrop click
  const handleExpandedBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  };

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isExpanded]);

  // Retry handler with forced refresh
  const handleRetry = () => {
    fetchBacklogData(true);
  };

  // Error state
  if (error && filteredGroups.length === 0) {
    return (
      <ErrorState
        className={className}
        onRetry={handleRetry}
        error={error}
      />
    );
  }

  // Loading state - initial load only
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
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-2 rounded-xl transition-all duration-200 hover:bg-slate-700/50"
        title="Open backlog collection"
      >
        <BookOpenIcon className="w-5 h-5 text-slate-400 hover:text-slate-300" />
      </button>

      {/* Normal Sidebar View */}
      <div className={className}>
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
          isMobile={isMobile}
          setIsExpanded={setIsExpanded}
          onGroupHover={handleGroupHover}
          onGroupExpand={handleGroupExpand}
          loadingGroups={loadingGroupIds}
          loadedGroups={loadedGroupIds}
        />
      </div>

      {/* Expanded Modal View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center ${isMobile ? 'p-2' : 'p-6'}`}
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
              className={`w-full h-full ${isMobile ? 'max-w-full max-h-full' : 'max-w-7xl max-h-[95vh]'} overflow-hidden`}
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
                isMobile={isMobile}
                setIsExpanded={setIsExpanded}
                onGroupHover={handleGroupHover}
                onGroupExpand={handleGroupExpand}
                loadingGroups={loadingGroupIds}
                loadedGroups={loadedGroupIds}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}