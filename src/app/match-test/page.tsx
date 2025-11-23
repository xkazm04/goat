"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTopList } from '@/hooks/use-top-lists';
import { useListStore } from '@/stores/use-list-store';
import { useItemStore } from '@/stores/item-store';
import { useBacklogStore } from '@/stores/backlog-store';
import { useSessionStore } from '@/stores/session-store';
import { BacklogProvider } from '@/providers/BacklogProvider';
import { SimpleMatchGrid } from '../features/Match/sub_MatchGrid/SimpleMatchGrid';

/**
 * Internal component that uses useSearchParams
 */
function MatchTestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listId = searchParams.get('list');

  const { currentList, setCurrentList } = useListStore();
  const itemStore = useItemStore();
  const { switchToSession, syncWithBackend, initializeGrid, gridItems } = itemStore;
  const activeSessionId = useSessionStore(state => state.activeSessionId);
  const initializeGroups = useBacklogStore(state => state.initializeGroups);

  // Fetch list data if we have a listId and don't have it cached
  const shouldFetch = !!listId && (!currentList || currentList.id !== listId);

  const {
    data: listData,
    error: fetchError,
    isLoading: isLoadingList
  } = useTopList(
    listId || '',
    true,
    {
      enabled: shouldFetch,
      refetchOnWindowFocus: false,
      retry: (failureCount: number) => failureCount < 3,
    } as any
  );

  // Initialize data when list is loaded
  useEffect(() => {
    if (!listId) {
      // No list ID - redirect to home or show message
      return;
    }

    const initializeData = async () => {
      try {
        // Case 1: Use cached list from local state
        if (currentList?.id === listId) {
          console.log('✅ Using cached list from local state:', currentList.id);

          if (activeSessionId !== listId) {
            switchToSession(listId);
          }

          // Initialize grid if needed
          if (!gridItems || gridItems.length === 0) {
            initializeGrid(currentList.size, currentList.id, currentList.category);
          }

          // Initialize backlog if needed
          const backlogStore = useBacklogStore.getState();
          if (currentList.category && (!backlogStore.groups || backlogStore.groups.length === 0)) {
            await initializeGroups(currentList.category, currentList.subcategory, true);
          }

          return;
        }

        // Case 2: Fresh data from API
        if (listData && listData.id === listId) {
          console.log('✅ Using fresh list data from backend:', listData.id);

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

          // Initialize grid
          initializeGrid(listData.size, listId, listData.category);

          // Initialize backlog data
          if (listData.category) {
            await initializeGroups(listData.category, listData.subcategory, true);
          }

          // Sync with backend to load any existing list items
          try {
            await syncWithBackend(listId);
            console.log('✅ Synced with backend successfully');
          } catch (syncError) {
            console.error('❌ Error syncing with backend:', syncError);
            // Continue anyway - user can still use the app
          }
        }
      } catch (error) {
        console.error('❌ Error initializing data:', error);
      }
    };

    initializeData();
  }, [
    listId,
    listData,
    currentList,
    activeSessionId,
    switchToSession,
    syncWithBackend,
    initializeGrid,
    setCurrentList,
    initializeGroups
  ]);

  // Show loading state
  if (isLoadingList && shouldFetch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading list...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (fetchError && shouldFetch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load list</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Show message if no list ID
  if (!listId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No list selected</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Render the match grid
  return (
    <BacklogProvider>
      <SimpleMatchGrid />
    </BacklogProvider>
  );
}

/**
 * Match Test Page - New simple drag and drop implementation
 *
 * Handles:
 * - Loading list data from query parameter
 * - Initializing grid and backlog stores
 * - Syncing with backend for existing items
 *
 * Access at: /match-test?list={listId}
 */
export default function MatchTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <MatchTestContent />
    </Suspense>
  );
}
