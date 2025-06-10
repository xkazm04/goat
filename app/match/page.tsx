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

  // Fetch list data if we have a listId but no current list
  const { 
    data: listData, 
    isLoading: fetchLoading, 
    error: fetchError,
    refetch
  } = useTopList(
    listId || '', 
    true, 
    { 
      enabled: !!listId && (!currentList || currentList.id !== listId),
      refetchOnWindowFocus: false
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

        // If we already have this list loaded, just switch to it
        if (currentList?.id === listId) {
          if (activeSessionId !== listId) {
            switchToSession(listId);
          }
          setIsLoading(false);
          return;
        }

        // If we have list data from the query, use it
        if (listData) {
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

  // Render loading state
  if (listLoading || fetchLoading) {
    return (
      <>
        <MatchHomeNavigation />
        <MatchLoadingState />
      </>
    );
  }

  // Render error state
  if (fetchError) {
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

  // Render main content
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <MatchHomeNavigation />
      
      <AnimatePresence mode="wait">
        {currentList && (
          <motion.div
            key={currentList.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <MatchContainer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}