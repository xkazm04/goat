"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MatchContainer } from '@/app/features/Match/MatchContainer';
import { useListStore } from '@/app/stores/use-list-store';
import { useItemStore } from '@/app/stores/item-store';
import { useTopList } from '@/app/hooks/use-top-lists';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';

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
    error: fetchError 
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
      // No list specified, redirect to home or show empty state
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

  // Loading state
  if (listLoading || fetchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Loading List</h2>
          <p className="text-slate-400">Preparing your ranking session...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">List Not Found</h2>
          <p className="text-slate-400 mb-6">
            The list you're looking for doesn't exist or you don't have access to it.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    );
  }

  // No list specified
  if (!listId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-slate-200 mb-4">No List Selected</h2>
          <p className="text-slate-400 mb-6">Please create or select a list to start ranking.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Browse Lists
          </button>
        </motion.div>
      </div>
    );
  }

  // Main content
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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