"use client";

import { useEffect, useState, useCallback } from 'react';
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

export default function MatchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listId = searchParams.get('list');
  
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

  // Local error state
  const [localError, setLocalError] = useState<string | null>(null);

  // Only fetch if we don't have the list in local state
  const shouldFetch = !!listId && (!currentList || currentList.id !== listId);
  
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
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
    }
  );

  // Stable callbacks
  const handleSessionSwitch = useCallback((id: string) => {
    if (activeSessionId !== id) {
      console.log('Switching to session:', id);
      switchToSession(id);
    }
  }, [activeSessionId, switchToSession]);

  const handleListSet = useCallback((listConfig: any) => {
    console.log('Setting current list:', listConfig.id);
    setCurrentList(listConfig);
  }, [setCurrentList]);

  const handleBackendSync = useCallback(async (id: string) => {
    if (syncWithBackend) {
      try {
        console.log('Syncing with backend...');
        await syncWithBackend(id);
      } catch (error) {
        console.warn('Sync with backend failed:', error);
      }
    }
  }, [syncWithBackend]);

  // Handle initial list loading - ONLY depend on primitive values
  useEffect(() => {
    if (!listId) {
      setLocalError(null);
      setIsLoading(false);
      return;
    }

    console.log(`🔄 Starting loadList for: ${listId}`);
    
    // If we already have the list cached, use it immediately
    if (currentList?.id === listId) {
      console.log('Using cached list from local state:', currentList.id);
      setIsLoading(false);
      setLocalError(null);
      
      // Only switch session if needed
      handleSessionSwitch(listId);
      return;
    }

    // If no cached list, we need to wait for fetch or show loading
    if (shouldFetch && !listData && fetchLoading) {
      console.log('Waiting for list data from API...');
      setIsLoading(true);
      return;
    }

    // If we have fresh data from API, process it
    if (listData?.id === listId) {
      console.log('Processing fresh list data from backend:', listData.id);
      setIsLoading(true);
      setLocalError(null);

      try {
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

        handleListSet(listConfig);
        handleSessionSwitch(listId);
        handleBackendSync(listId);
        
      } catch (error) {
        console.error('Error processing list data:', error);
        setLocalError(error instanceof Error ? error.message : 'Failed to load list');
      } finally {
        setIsLoading(false);
      }
    }

    // Handle fetch error
    if (fetchError && shouldFetch) {
      console.error('Fetch error:', fetchError);
      setLocalError('Failed to load list from server');
      setIsLoading(false);
    }

  }, [
    listId, 
    currentList?.id, 
    listData?.id, 
    fetchLoading, 
    fetchError,
    shouldFetch
    // Removed: handleSessionSwitch, handleListSet, handleBackendSync, setIsLoading
    // These are now stable callbacks or handled inside the effect
  ]);

  // Handle retry
  const handleRetry = useCallback(() => {
    if (listId) {
      setLocalError(null);
      setIsLoading(true);
      refetch();
    }
  }, [listId, refetch, setIsLoading]);

  // Handle navigation
  const handleGoHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleCreateList = useCallback(() => {
    router.push('/create');
  }, [router]);

  // If we have a valid list, show the match container
  if (listId && currentList?.id === listId && !localError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <MatchHomeNavigation />
        
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
      </div>
    );
  }

  // Show loading state
  if (listLoading || (fetchLoading && shouldFetch)) {
    return (
      <>
        <MatchHomeNavigation />
        <MatchLoadingState message="Loading List" submessage="Preparing your ranking session..." />
      </>
    );
  }

  // Show error state
  if (localError || (fetchError && shouldFetch)) {
    return (
      <>
        <MatchHomeNavigation />
        <MatchErrorState 
          title="Failed to Load List"
          message={localError || fetchError?.message || 'Could not load the requested list'}
          onRetry={handleRetry}
          showRetryButton={true}
          showHomeButton={true}
        />
      </>
    );
  }

  // Show no list state
  if (!listId) {
    return (
      <>
        <MatchHomeNavigation />
        <MatchNoListState 
          onPrimaryClick={handleGoHome}
          onSecondaryClick={handleCreateList}
        />
      </>
    );
  }

  // Final fallback
  return (
    <>
      <MatchHomeNavigation />
      <MatchLoadingState message="Loading List" submessage="Please wait..." />
    </>
  );
}