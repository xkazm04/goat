"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useItemStore } from "@/app/stores/item-store";
import { useGroupsByCategory, usePrefetchGroupItems } from "@/app/hooks/use-item-groups";
import { useCurrentList } from "@/app/stores/use-list-store";
import React from "react";
import SidebarContent from "./BacklogGroups/SidebarContent";
import { ErrorState, LoadingState } from "./BacklogGroupStates";
import { BookOpenIcon } from "lucide-react";
import { 
  BacklogDataProcessor, 
  BacklogPerformanceTracker,
  GroupLoadingState 
} from "./BacklogGroups/backlog-data-processor";

interface BacklogGroupsProps {
  className?: string;
}

export function BacklogGroups({ className }: BacklogGroupsProps) {
  const { backlogGroups: storeGroups, setBacklogGroups, loadGroupItems } = useItemStore();
  const currentList = useCurrentList();
  const prefetchGroupItems = usePrefetchGroupItems();
  
  // Search and UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedViewMode, setExpandedViewMode] = useState<'grid' | 'list'>('list');
  const [isMobile, setIsMobile] = useState(false);

  // Enhanced loading state management
  const [loadingState, setLoadingState] = useState<GroupLoadingState>({
    loadedGroups: new Set(),
    loadingGroups: new Set()
  });

  const isAutoLoadingRef = useRef(false);
  const hasTriggeredAutoLoadRef = useRef(false);
  const lastProcessedGroupsRef = useRef<string>('');

  // Multi-level debouncing for optimal performance
  useEffect(() => {
    const timer = setTimeout(() => setClientSearchTerm(searchTerm), 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Determine query parameters
  const queryCategory = currentList?.category || 'sports';
  const querySubcategory = useMemo(() => {
    return queryCategory.toLowerCase() === 'sports' ? currentList?.subcategory : undefined;
  }, [queryCategory, currentList?.subcategory]);

  // Fetch groups using the hook
  const {
    data: apiGroups = [],
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups
  } = useGroupsByCategory(
    queryCategory,
    querySubcategory,
    debouncedSearchTerm,
    {
      enabled: !!queryCategory,
      refetchOnWindowFocus: false,
      staleTime: 3 * 60 * 1000,
    }
  );

  // Process API groups with performance tracking
  const processedGroups = useMemo(() => {
    BacklogPerformanceTracker.startTimer('processApiGroups');
    
    const result = BacklogDataProcessor.processApiGroups(apiGroups, storeGroups);
    
    BacklogPerformanceTracker.endTimer('processApiGroups');
    BacklogPerformanceTracker.logState('processedGroups', {
      input: { api: apiGroups.length, store: storeGroups.length },
      output: result.length
    });
    
    return result;
  }, [apiGroups, storeGroups]);

  // Merge with store and determine main data source
  const { groups: backlogGroups, hasChanges } = useMemo(() => {
    BacklogPerformanceTracker.startTimer('mergeWithStore');
    
    const result = BacklogDataProcessor.mergeWithStore(processedGroups, storeGroups);
    
    BacklogPerformanceTracker.endTimer('mergeWithStore');
    
    return result;
  }, [processedGroups, storeGroups]);

  // Update store when groups change
  useEffect(() => {
    if (hasChanges && processedGroups.length > 0) {
      console.log('🔄 Updating store with new groups:', processedGroups.length);
      setBacklogGroups(processedGroups);
      
      // Reset loading states when groups change and reset auto-load trigger
      setLoadingState({
        loadedGroups: new Set(),
        loadingGroups: new Set()
      });
      hasTriggeredAutoLoadRef.current = false;
    }
  }, [hasChanges, processedGroups, setBacklogGroups]);

  // Individual group item loading
  const handleLoadGroupItems = useCallback(async (groupId: string): Promise<void> => {
    // Simple check - if already loading or loaded, skip
    if (loadingState.loadingGroups.has(groupId) || loadingState.loadedGroups.has(groupId)) {
      return;
    }

    const group = backlogGroups.find(g => g.id === groupId);
    if (!group || group.item_count === 0) {
      return;
    }

    console.log(`🔄 Loading items for: ${group.name}`);
    
    setLoadingState(prev => BacklogDataProcessor.updateLoadingState(prev, groupId, 'start'));
    
    try {
      await loadGroupItems(groupId); // This will call the fixed session store method
      setLoadingState(prev => BacklogDataProcessor.updateLoadingState(prev, groupId, 'complete'));
      console.log(`✅ Loaded items for: ${group.name}`);
    } catch (error) {
      console.error(`❌ Failed to load ${group.name}:`, error);
      setLoadingState(prev => BacklogDataProcessor.updateLoadingState(prev, groupId, 'error'));
    }
  }, [backlogGroups, loadGroupItems, loadingState]);

  // Simple auto-load first 3 groups
  useEffect(() => {
    if (backlogGroups.length === 0) return;

    const timer = setTimeout(async () => {
      console.log(`🚀 Auto-loading first 3 groups from ${backlogGroups.length} total groups`);
      
      // Load first 3 groups that have items but no loaded items
      const groupsToLoad = backlogGroups
        .slice(0, 3)
        .filter(group => 
          group.item_count > 0 && 
          group.items.length === 0 &&
          !loadingState.loadingGroups.has(group.id) &&
          !loadingState.loadedGroups.has(group.id)
        );

      if (groupsToLoad.length === 0) {
        console.log('📭 No groups need auto-loading');
        return;
      }

      for (const group of groupsToLoad) {
        try {
          console.log(`📥 Auto-loading: ${group.name} (${group.item_count} items)`);
          await handleLoadGroupItems(group.id);
          // Small delay between groups
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`❌ Failed to auto-load ${group.name}:`, error);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [backlogGroups.length]); // Only depend on groups count, not the complex state

  // Reset auto-load trigger when categories change
  useEffect(() => {
    hasTriggeredAutoLoadRef.current = false;
    lastProcessedGroupsRef.current = '';
    isAutoLoadingRef.current = false;
  }, [queryCategory, querySubcategory]);

  // Filter groups with performance optimization
  const filteredGroups = useMemo(() => {
    BacklogPerformanceTracker.startTimer('filterGroups');
    
    const result = BacklogDataProcessor.filterGroups(backlogGroups, clientSearchTerm);
    
    BacklogPerformanceTracker.endTimer('filterGroups');
    
    return result;
  }, [backlogGroups, clientSearchTerm]);

  // Calculate total items
  const totalItems = useMemo(() => {
    return BacklogDataProcessor.calculateTotalItems(backlogGroups);
  }, [backlogGroups]);

  // Enhanced interaction handlers
  const handleGroupHover = useCallback(async (groupId: string) => {
    prefetchGroupItems(groupId);
    await handleLoadGroupItems(groupId);
  }, [prefetchGroupItems, handleLoadGroupItems]);

  const handleGroupExpand = useCallback(async (groupId: string) => {
    await handleLoadGroupItems(groupId);
  }, [handleLoadGroupItems]);

  // Modal handlers
  const handleExpandedBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  }, []);

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

  // Enhanced debug logging
  useEffect(() => {
    BacklogPerformanceTracker.logState('BacklogGroups State', {
      category: queryCategory,
      subcategory: querySubcategory,
      searchTerm: debouncedSearchTerm,
      counts: {
        api: apiGroups.length,
        processed: processedGroups.length,
        backlog: backlogGroups.length,
        filtered: filteredGroups.length,
        store: storeGroups.length
      },
      loading: {
        loaded: Array.from(loadingState.loadedGroups),
        loading: Array.from(loadingState.loadingGroups),
        isGroupsLoading: groupsLoading,
        isAutoLoading: isAutoLoadingRef.current,
        hasTriggeredAutoLoad: hasTriggeredAutoLoadRef.current
      },
      validation: BacklogDataProcessor.validateGroupsData(backlogGroups)
    });
  }, [
    queryCategory, querySubcategory, debouncedSearchTerm,
    apiGroups.length, processedGroups.length, backlogGroups.length, 
    filteredGroups.length, storeGroups.length,
    loadingState, groupsLoading
  ]);

  // Loading states
  const isLoading = groupsLoading || (backlogGroups.length === 0);
  const error = groupsError;

  // Validate data before rendering
  if (!BacklogDataProcessor.validateGroupsData(backlogGroups)) {
    return (
      <ErrorState 
        className={className}
        onRetry={() => window.location.reload()}
        error={new Error('Invalid groups data structure')}
      />
    );
  }

  // Loading state
  if (isLoading && backlogGroups.length === 0) {
    return (
      <LoadingState 
        currentList={currentList}
        className={className}
      />
    );
  }

  // Error state
  if (error && backlogGroups.length === 0) {
    return (
      <ErrorState 
        className={className}
        onRetry={() => refetchGroups()}
        error={error}
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
          backlogGroups={backlogGroups}
          currentList={currentList}
          totalItems={totalItems}
          apiTotalItems={totalItems}
          expandedViewMode={expandedViewMode}
          isMobile={isMobile}
          setIsExpanded={setIsExpanded}
          onGroupHover={handleGroupHover}
          onGroupExpand={handleGroupExpand}
          loadingGroups={loadingState.loadingGroups}
          loadedGroups={loadingState.loadedGroups}
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
                backlogGroups={backlogGroups}
                currentList={currentList}
                totalItems={totalItems}
                apiTotalItems={totalItems}
                expandedViewMode={expandedViewMode}
                isMobile={isMobile}
                setIsExpanded={setIsExpanded}
                onGroupHover={handleGroupHover}
                onGroupExpand={handleGroupExpand}
                loadingGroups={loadingState.loadingGroups}
                loadedGroups={loadingState.loadedGroups}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}