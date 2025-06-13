"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { MatchContainer } from '@/app/features/Match/MatchContainer';
import { 
  MatchLoadingState, 
  MatchErrorState, 
  MatchNoListState,
  MatchHomeNavigation 
} from '@/app/features/Match/MatchStates';

// Stores and hooks
import { useListStore } from '@/app/stores/use-list-store';
import { useItemStore } from '@/app/stores/item-store';
import { useTopList } from '@/app/hooks/use-top-lists';
import { BacklogProvider } from '@/app/providers/BacklogProvider';

// Don't use the hook directly - use getState instead
import { useBacklogStore } from '@/app/stores/backlog-store';

export default function MatchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listId = searchParams.get('list');
  
  // Ref to store backlog state
  const backlogRef = useRef({
    isLoading: false,
    groups: []
  });

  // Track initialization status
  const [backlogInitialized, setBacklogInitialized] = useState(false);
  
  // Track backlog loading status manually
  const [isBacklogLoading, setIsBacklogLoading] = useState(false);
  
  const { 
    currentList, 
    setCurrentList, 
    isLoading: listLoading,
    setIsLoading 
  } = useListStore();
  
  const { 
    switchToSession, 
    activeSessionId,
    syncWithBackend 
  } = useItemStore();

  // Only fetch if we don't have the list in local state AND it's not a newly created list
  const shouldFetch = !!listId && (!currentList || currentList.id !== listId);
  
  // Add delay for newly created lists to prevent race condition
  const { 
    data: listData, 
    isLoading: fetchLoading, 
    error: fetchError,
    refetch
  } = useTopList(
    listId || '', 
    true, 
    { 
      enabled: shouldFetch,
      refetchOnWindowFocus: false,
      retry: (failureCount) => failureCount < 5 && shouldFetch,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 16000),
    }
  );

  // Update backlog ref from store
  useEffect(() => {
    // Only run this effect once on component mount
    const unsubscribe = useBacklogStore.subscribe(
      (state) => {
        backlogRef.current = {
          isLoading: state.isLoading,
          groups: state.groups
        };
        
        // Update loading state for component
        setIsBacklogLoading(state.isLoading);
      }
    );
    
    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []);

  // Create a function to initialize backlog
  const initializeBacklogData = useCallback((category: string, subcategory?: string) => {
    if (!backlogInitialized && category) {
      console.log('Initializing backlog data for category:', category);
      
      // Access store directly through getState instead of hook
      const backlogStore = useBacklogStore.getState();
      
      // Track loading state
      setIsBacklogLoading(true);
      
      // Initialize groups
      backlogStore.initializeGroups(category, subcategory, true)
        .then(() => {
          setBacklogInitialized(true);
          setIsBacklogLoading(false);
        })
        .catch((error) => {
          console.error('Failed to initialize backlog:', error);
          setIsBacklogLoading(false);
        });
    }
  }, [backlogInitialized]);

  // Memoize the current list info
  const currentListInfo = useMemo(() => ({
    id: currentList?.id,
    category: currentList?.category,
    subcategory: currentList?.subcategory
  }), [currentList?.id, currentList?.category, currentList?.subcategory]);

  // Handle list loading and session switching
  useEffect(() => {
    if (!listId) return;

    const loadList = async () => {
      try {
        setIsLoading(true);
        
        // Case 1: Use cached list from local state
        if (currentList?.id === listId) {
          console.log('Using cached list from local state:', currentList.id);
          
          if (activeSessionId !== listId) {
            switchToSession(listId);
          }
          
          // Initialize backlog with cached list data if needed
          const { groups } = backlogRef.current;
          if (currentList.category && (!groups || groups.length === 0)) {
            initializeBacklogData(currentList.category, currentList.subcategory);
          }
          
          setIsLoading(false);
          return;
        }

        // Case 2: Fresh data from API
        if (listData && listData.id === listId) {
          console.log('Using fresh list data from backend:', listData.id);
          
          const listConfig = {
            ...listData,
            metadata: {
              size: listData.size,
              selectedCategory: listData.category,
              selectedSubcategory: listData.subcategory,
              timePeriod: "all-time" as const,
              color: {
                primary: "#3b82f6",
                secondary: "#1e40af", 
                accent: "#60a5fa"
              }
            }
          };

          setCurrentList(listConfig);
          switchToSession(listId);
          
          // Initialize backlog data if needed
          if (listData.category) {
            initializeBacklogData(listData.category, listData.subcategory);
          }
          
          // Sync with backend to load any existing list items
          await syncWithBackend(listId);
        }
      } catch (error) {
        console.error('Error loading list:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadList();
  }, [
    listId, 
    listData, 
    activeSessionId, 
    switchToSession, 
    syncWithBackend, 
    setIsLoading,
    initializeBacklogData,
    // Use stable references
    currentListInfo.id,
    setCurrentList
  ]);

  // Event handlers
  const handleRetry = useCallback(() => {
    if (listId) {
      setIsLoading(true);
      refetch();
    }
  }, [listId, setIsLoading, refetch]);

  const handleGoHome = useCallback(() => router.push('/'), [router]);
  const handleCreateList = useCallback(() => router.push('/create'), [router]);

  // Calculate loading state
  const isLoading = useMemo(() => 
    (listLoading || fetchLoading || isBacklogLoading) && shouldFetch, 
    [listLoading, fetchLoading, isBacklogLoading, shouldFetch]
  );

  // Memoize the match container
  const matchContainer = useMemo(() => {
    if (listId && currentList?.id === listId) {
      return (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentList.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <MatchContainer />
          </motion.div>
        </AnimatePresence>
      );
    }
    return null;
  }, [listId, currentList?.id]);

  return (
    <BacklogProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <MatchHomeNavigation />
        
        {/* Main content */}
        {matchContainer || (
          <>
            {/* Loading state */}
            {isLoading && <MatchLoadingState />}
            
            {/* Error state */}
            {(fetchError && shouldFetch) && (
              <MatchErrorState 
                onRetry={handleRetry}
                showRetryButton={true}
              />
            )}
            
            {/* No list state */}
            {!listId && (
              <MatchNoListState 
                onPrimaryClick={handleGoHome}
                onSecondaryClick={handleCreateList}
              />
            )}
            
            {/* Fallback loading state */}
            {listId && !currentList && !fetchError && !fetchLoading && !listLoading && (
              <MatchLoadingState />
            )}
          </>
        )}
      </div>
    </BacklogProvider>
  );
}