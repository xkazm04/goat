"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useItemStore } from "@/app/stores/item-store";
import { useCurrentList } from "@/app/stores/use-list-store";
import React from "react";
import SidebarContent from "./BacklogGroups/SidebarContent";
import { ErrorState, LoadingState } from "./BacklogGroupStates";
import { BookOpenIcon } from "lucide-react";

interface BacklogGroupsProps {
  className?: string;
}

export function BacklogGroups({ className }: BacklogGroupsProps) {
  const { 
    backlogGroups, 
    initializeBacklogData, 
    loadGroupItems, 
    searchGroups,
    filterGroupsByCategory 
  } = useItemStore();
  
  const currentList = useCurrentList();
  
  // UI state only
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedViewMode, setExpandedViewMode] = useState<'grid' | 'list'>('list');
  const [isMobile, setIsMobile] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  
  // Track loading state for individual groups
  const [loadingGroups, setLoadingGroups] = useState<Set<string>>(new Set());
  const [loadedGroups, setLoadedGroups] = useState<Set<string>>(new Set());
  
  // Refs for preventing duplicate initialization
  const initializationRef = useRef<{ category?: string; subcategory?: string }>({});
  const hasInitialized = useRef(false);

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize data when category changes - SINGLE FETCH
  useEffect(() => {
    const initializeData = async () => {
      if (!currentList?.category) return;
      
      const category = currentList.category;
      const subcategory = currentList.subcategory;
      
      // Check if we already initialized for this category/subcategory
      const currentKey = `${category}-${subcategory || ''}`;
      const previousKey = `${initializationRef.current.category}-${initializationRef.current.subcategory || ''}`;
      
      if (currentKey === previousKey && hasInitialized.current) {
        console.log(`📋 BacklogGroups: Already initialized for ${currentKey}`);
        return;
      }

      console.log(`🚀 BacklogGroups: Initializing for ${currentKey}`);
      setIsInitializing(true);
      setInitializationError(null);

      try {
        await initializeBacklogData(category, subcategory);
        
        // Update refs to track successful initialization
        initializationRef.current = { category, subcategory };
        hasInitialized.current = true;
        
        console.log(`✅ BacklogGroups: Successfully initialized for ${currentKey}`);
        
      } catch (error) {
        console.error(`❌ BacklogGroups: Failed to initialize for ${currentKey}:`, error);
        setInitializationError(error as Error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeData();
  }, [currentList?.category, currentList?.subcategory, initializeBacklogData]);

  // Local search - no API calls
  const filteredGroups = useMemo(() => {
    if (!currentList?.category) return [];
    
    // Start with category filter
    let groups = filterGroupsByCategory(currentList.category, currentList.subcategory);
    
    // Apply search filter locally
    if (searchTerm.trim()) {
      groups = searchGroups(searchTerm.trim());
      // Further filter by category after search
      groups = groups.filter(group => {
        const matchesCategory = group.category === currentList.category;
        const matchesSubcategory = !currentList.subcategory || group.subcategory === currentList.subcategory;
        return matchesCategory && matchesSubcategory;
      });
    }
    
    return groups;
  }, [currentList?.category, currentList?.subcategory, searchTerm, filterGroupsByCategory, searchGroups]);

  // Calculate total items from local data
  const totalItems = useMemo(() => {
    return filteredGroups.reduce((sum, group) => sum + (group.items?.length || 0), 0);
  }, [filteredGroups]);

  // Individual group item loading with local state tracking
  const handleLoadGroupItems = useCallback(async (groupId: string): Promise<void> => {
    if (loadingGroups.has(groupId) || loadedGroups.has(groupId)) {
      return; // Already loading or loaded
    }

    const group = filteredGroups.find(g => g.id === groupId);
    if (!group || group.item_count === 0) {
      return;
    }

    console.log(`🔄 Loading items for: ${group.name}`);
    
    setLoadingGroups(prev => new Set(prev).add(groupId));
    
    try {
      await loadGroupItems(groupId);
      setLoadedGroups(prev => new Set(prev).add(groupId));
      console.log(`✅ Loaded items for: ${group.name}`);
    } catch (error) {
      console.error(`❌ Failed to load ${group.name}:`, error);
    } finally {
      setLoadingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  }, [filteredGroups, loadGroupItems, loadingGroups, loadedGroups]);

  // Enhanced interaction handlers
  const handleGroupHover = useCallback(async (groupId: string) => {
    // Just load items on hover - no prefetching needed
    await handleLoadGroupItems(groupId);
  }, [handleLoadGroupItems]);

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

  // Loading state - show while initializing
  const isLoading = isInitializing || (!hasInitialized.current && filteredGroups.length === 0);

  // Error state
  if (initializationError && filteredGroups.length === 0) {
    return (
      <ErrorState 
        className={className}
        onRetry={() => {
          hasInitialized.current = false;
          initializationRef.current = {};
          setInitializationError(null);
        }}
        error={initializationError}
      />
    );
  }

  // Loading state
  if (isLoading) {
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
          backlogGroups={filteredGroups}
          currentList={currentList}
          totalItems={totalItems}
          apiTotalItems={totalItems}
          expandedViewMode={expandedViewMode}
          isMobile={isMobile}
          setIsExpanded={setIsExpanded}
          onGroupHover={handleGroupHover}
          onGroupExpand={handleGroupExpand}
          loadingGroups={loadingGroups}
          loadedGroups={loadedGroups}
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
                backlogGroups={filteredGroups}
                currentList={currentList}
                totalItems={totalItems}
                apiTotalItems={totalItems}
                expandedViewMode={expandedViewMode}
                isMobile={isMobile}
                setIsExpanded={setIsExpanded}
                onGroupHover={handleGroupHover}
                onGroupExpand={handleGroupExpand}
                loadingGroups={loadingGroups}
                loadedGroups={loadedGroups}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}