"use client";

/**
 * Match Page - List Management Interface
 *
 * This page orchestrates the complete data loading flow using a unified state machine:
 *
 * STATE FLOW:
 * 1. IDLE → LOADING_LIST: Initial list data load (from cache or API)
 * 2. LOADING_LIST → LOADING_FETCH: Fetch detailed list items from backend
 * 3. LOADING_FETCH → LOADING_BACKLOG: Load backlog items for comparison
 * 4. LOADING_BACKLOG → SUCCESS: All data loaded successfully
 * 5. Any LOADING_* → ERROR: Error occurred during loading (with recovery actions)
 *
 * FEATURES:
 * - Unified loading state machine with proper state transitions
 * - Multi-stage loading indicator with visual progress feedback
 * - Categorized error handling (NETWORK, VALIDATION, SERVER, UNKNOWN)
 * - Retry recovery actions for all error states
 * - Debug logging in development mode for state transitions
 * - Optimistic caching with fallback to API
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UseQueryOptions } from '@tanstack/react-query';

// Components
import { MatchContainer } from '@/app/features/Match/MatchContainer';
import {
  MatchLoadingState,
  MatchErrorState,
  MatchNoListState,
  MatchHomeNavigation
} from '@/app/features/Match/MatchStates';
import { LoadingErrorBoundary } from '@/app/features/Match/components/LoadingErrorBoundary';
import { LoadingStateIndicator } from '@/components/ui/loading-state-indicator';

// Stores and hooks
import { useListStore } from '@/stores/use-list-store';
import { useItemStore } from '@/stores/item-store';
import { useTopList } from '@/hooks/use-top-lists';
import { BacklogProvider } from '@/providers/BacklogProvider';
import {
  useLoadingStateMachine,
  categorizeHttpError,
  createRetryRecoveryAction
} from '@/hooks';

// Error simulator for development/testing
import { errorSimulator } from '@/lib/utils/error-simulator';

// Don't use the hook directly - use getState instead
import { useBacklogStore } from '@/stores/backlog-store';
import { useSessionStore } from '@/stores/session-store';

export default function MatchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listId = searchParams.get('list');

  // Initialize loading state machine
  const loadingStateMachine = useLoadingStateMachine();

  // Extract stable callbacks to avoid re-renders
  const {
    startListLoad,
    startFetchLoad,
    startBacklogLoad,
    setSuccess,
    setNetworkError,
    setValidationError,
    setServerError,
    setUnknownError,
    reset,
    isLoading: isLoadingState,
    state: loadingState
  } = loadingStateMachine;

  // Ref to store backlog state
  const backlogRef = useRef<{
    isLoading: boolean;
    groups: any[];
  }>({
    isLoading: false,
    groups: []
  });

  // Track initialization status
  const [backlogInitialized, setBacklogInitialized] = useState(false);

  const {
    currentList,
    setCurrentList
  } = useListStore();

  const itemStore = useItemStore();
  const { switchToSession, syncWithBackend } = itemStore;
  const activeSessionId = useSessionStore(state => state.activeSessionId);

  // Only fetch if we don't have the list in local state AND it's not a newly created list
  const shouldFetch = !!listId && (!currentList || currentList.id !== listId);

  // Add delay for newly created lists to prevent race condition
  const queryOptions: Partial<UseQueryOptions> = {
    enabled: shouldFetch,
    refetchOnWindowFocus: false,
    retry: failureCount => failureCount < 5 && shouldFetch,
    retryDelay: attemptIndex => Math.min(1000 * Math.pow(2, attemptIndex), 16000),
  };

  const {
    data: listData,
    error: fetchError,
    refetch
  } = useTopList(
    listId || '',
    true,
    queryOptions as any
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

        // Update loading state machine when backlog loading changes
        if (state.isLoading && !loadingStateMachine.isLoadingBacklog) {
          startBacklogLoad();
        }
      }
    );

    // Clean up subscription on unmount
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startBacklogLoad]);

  /**
   * Initialize backlog data for the current category
   * STATE TRANSITION: LOADING_FETCH → LOADING_BACKLOG → SUCCESS
   *
   * This function loads item groups from the API to populate the backlog
   * for adding items to the list during comparison/ranking.
   */
  const initializeBacklogData = useCallback((category: string, subcategory?: string) => {
    if (!backlogInitialized && category) {
      console.log('🔄 Initializing backlog data for category:', category);

      // Access store directly through getState instead of hook
      const backlogStore = useBacklogStore.getState();

      // STATE TRANSITION: (current state) → LOADING_BACKLOG
      startBacklogLoad();

      // Initialize groups from API (uses itemGroupsApi.getGroupsByCategory)
      backlogStore.initializeGroups(category, subcategory, true)
        .then(async () => {
          // Simulate error if enabled (for testing error handling)
          await errorSimulator.simulateError();

          setBacklogInitialized(true);

          // STATE TRANSITION: LOADING_BACKLOG → SUCCESS
          setSuccess({ source: 'backlog', category });
        })
        .catch((error) => {
          console.error('❌ Failed to initialize backlog:', error);

          // STATE TRANSITION: LOADING_BACKLOG → ERROR
          // Categorize and handle the error with retry capability
          const { errorType, message, statusCode, details } = categorizeHttpError(error);

          const retryAction = createRetryRecoveryAction(
            async () => {
              setBacklogInitialized(false);
              await initializeBacklogData(category, subcategory);
            },
            () => reset()
          );

          // Dispatch appropriate error based on type
          switch (errorType) {
            case 'NETWORK':
              setNetworkError(message, retryAction, details);
              break;
            case 'VALIDATION':
              setValidationError(message, retryAction, statusCode, details);
              break;
            case 'SERVER':
              setServerError(message, retryAction, statusCode, details);
              break;
            default:
              setUnknownError(message, retryAction, details);
          }
        });
    }
  }, [backlogInitialized, startBacklogLoad, setSuccess, setNetworkError, setValidationError, setServerError, setUnknownError, reset]);

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
        // STATE TRANSITION: IDLE → LOADING_LIST
        // Begin the loading sequence by fetching list metadata
        startListLoad();

        // Case 1: Use cached list from local state (optimistic path)
        if (currentList?.id === listId) {
          console.log('✅ Using cached list from local state:', currentList.id);

          if (activeSessionId !== listId) {
            switchToSession(listId);
          }

          // Initialize backlog with cached list data if needed
          const { groups } = backlogRef.current;
          if (currentList.category && (!groups || groups.length === 0)) {
            // STATE TRANSITION: LOADING_LIST → LOADING_BACKLOG (skip LOADING_FETCH for cache)
            initializeBacklogData(currentList.category, currentList.subcategory);
          }

          // STATE TRANSITION: LOADING_LIST → SUCCESS
          setSuccess({ source: 'cache', listId });
          return;
        }

        // Case 2: Fresh data from API (network path)
        if (listData && listData.id === listId) {
          console.log('✅ Using fresh list data from backend:', listData.id);

          // STATE TRANSITION: LOADING_LIST → LOADING_FETCH
          // Move to fetching detailed list items
          startFetchLoad();

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
          // This will trigger STATE TRANSITION: LOADING_FETCH → LOADING_BACKLOG
          if (listData.category) {
            initializeBacklogData(listData.category, listData.subcategory);
          }

          // Sync with backend to load any existing list items
          try {
            await syncWithBackend(listId);
            // STATE TRANSITION: LOADING_FETCH (or LOADING_BACKLOG) → SUCCESS
            setSuccess({ source: 'api', listId });
          } catch (syncError) {
            console.error('❌ Error syncing with backend:', syncError);

            // STATE TRANSITION: LOADING_FETCH → ERROR
            // Categorize and handle sync error with appropriate error type
            const { errorType, message, statusCode, details } = categorizeHttpError(syncError);

            const retryAction = createRetryRecoveryAction(
              async () => {
                await syncWithBackend(listId);
              },
              () => reset()
            );

            // Dispatch categorized error to state machine
            switch (errorType) {
              case 'NETWORK':
                setNetworkError(
                  `Failed to sync list data: ${message}`,
                  retryAction,
                  details
                );
                break;
              case 'VALIDATION':
                setValidationError(
                  `Invalid list data: ${message}`,
                  retryAction,
                  statusCode,
                  details
                );
                break;
              case 'SERVER':
                setServerError(
                  `Server error while syncing: ${message}`,
                  retryAction,
                  statusCode,
                  details
                );
                break;
              default:
                setUnknownError(
                  `Unexpected error: ${message}`,
                  retryAction,
                  details
                );
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading list:', error);

        // STATE TRANSITION: LOADING_LIST → ERROR
        // Categorize and handle the error with appropriate recovery action
        const { errorType, message, statusCode, details } = categorizeHttpError(error);

        const retryAction = createRetryRecoveryAction(
          async () => {
            await loadList();
          },
          () => reset()
        );

        // Dispatch appropriate error based on type
        switch (errorType) {
          case 'NETWORK':
            setNetworkError(
              `Unable to load list: ${message}`,
              retryAction,
              details
            );
            break;
          case 'VALIDATION':
            setValidationError(
              `Invalid list request: ${message}`,
              retryAction,
              statusCode,
              details
            );
            break;
          case 'SERVER':
            setServerError(
              `Server error: ${message}`,
              retryAction,
              statusCode,
              details
            );
            break;
          default:
            setUnknownError(
              `Failed to load list: ${message}`,
              retryAction,
              details
            );
        }
      }
    };

    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    listId,
    listData,
    activeSessionId,
    switchToSession,
    syncWithBackend,
    initializeBacklogData,
    startListLoad,
    startFetchLoad,
    setSuccess,
    setNetworkError,
    setValidationError,
    setServerError,
    setUnknownError,
    reset,
    // Use stable references
    currentListInfo.id,
    setCurrentList
  ]);

  // Event handlers
  const handleRetry = useCallback(() => {
    if (listId) {
      startFetchLoad();
      refetch();
    }
  }, [listId, startFetchLoad, refetch]);

  const handleGoHome = useCallback(() => router.push('/'), [router]);
  const handleCreateList = useCallback(() => router.push('/create'), [router]);

  // Helper function to check if any loading is in progress
  const isLoading = useCallback(() => {
    return isLoadingState;
  }, [isLoadingState]);

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

        {/* Multi-stage loading indicator */}
        <LoadingStateIndicator state={loadingState} />

        {/* Error boundary for state machine errors */}
        <LoadingErrorBoundary
          state={loadingState}
          onDismiss={reset}
        />

        {/* Main content */}
        {matchContainer || (
          <>
            {/* Loading state */}
            {isLoading() && <MatchLoadingState />}

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
            {listId && !currentList && !fetchError && !isLoadingState && (
              <MatchLoadingState />
            )}
          </>
        )}
      </div>
    </BacklogProvider>
  );
}