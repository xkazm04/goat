"use client";

import { useEffect } from 'react';
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
      // Increase retry attempts and delay for new lists
      retry: (failureCount, error) => {
        if (failureCount < 5 && shouldFetch) {
          return true;
        }
        return false;
      },
      retryDelay: (attemptIndex) => {
        // Progressive delay: 1s, 2s, 4s, 8s, 16s
        return Math.min(1000 * Math.pow(2, attemptIndex), 16000);
      },
    }
  );

  // Handle list loading and session switching
  useEffect(() => {
    if (!listId) {
      return;
    }

    const loadList = async () => {
      try {
        setIsLoading(true);
        if (currentList?.id === listId) {
          console.log('Using cached list from local state:', currentList.id);
          if (activeSessionId !== listId) {
            switchToSession(listId);
          }
          setIsLoading(false);
          return;
        }

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
  }, [listId, listData, currentList?.id, activeSessionId, setCurrentList, switchToSession, syncWithBackend, setIsLoading]);

  // Handle retry for error state
  const handleRetry = () => {
    if (listId) {
      setIsLoading(true);
      refetch();
    }
  };

  // Handle navigation
  const handleGoHome = () => {
    router.push('/');
  };

  const handleCreateList = () => {
    router.push('/create');
  };

  // PRIORITY: If we have a list in local state, show it immediately (no backend dependency)
  if (listId && currentList?.id === listId) {
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

  // Render loading state (only show if we're actually fetching)
  if ((listLoading || fetchLoading) && shouldFetch) {
    return (
      <>
        <MatchHomeNavigation />
        <MatchLoadingState />
      </>
    );
  }

  // Render error state (only if we tried to fetch and failed)
  if (fetchError && shouldFetch) {
    return (
      <>
        <MatchHomeNavigation />
        <MatchErrorState 
          onRetry={handleRetry}
          showRetryButton={true}
        />
      </>
    );
  }

  // Render no list state
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

  // Final fallback - show loading while waiting
  return (
    <>
      <MatchHomeNavigation />
      <MatchLoadingState />
    </>
  );
}