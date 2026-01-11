/**
 * Central export file for all custom hooks
 * Consolidates hook management in a single location
 */

// ========================================
// Supabase Integration Hooks (New)
// ========================================
// NOTE: Currently commented out - requires @supabase/supabase-js package installation
// Uncomment when Supabase integration is ready

/**
 * Supabase Query Hook
 * Wraps Supabase queries with loading, error, and data states
 * Follows React Query patterns for consistency
 */
// export {
//   useSupabaseQuery,
//   useSupabasePaginatedQuery,
//   type SupabaseQueryState,
//   type SupabaseQueryOptions,
//   type SupabaseQueryFn,
// } from './useSupabaseQuery';

/**
 * Supabase Mutation Hook
 * Handles insert, update, delete operations with optimistic updates
 */
// export {
//   useSupabaseMutation,
//   useSupabaseBatchMutation,
//   type SupabaseMutationState,
//   type SupabaseMutationOptions,
//   type SupabaseMutationFn,
// } from './useSupabaseMutation';

/**
 * Supabase Authentication Hook
 * Manages authentication state using Supabase's built-in auth methods
 */
// export {
//   useSupabaseAuth,
//   useSupabaseUser,
//   useSupabaseUserRole,
//   type AuthState,
//   type AuthActions,
//   type UseSupabaseAuthReturn,
//   type UseSupabaseAuthOptions,
// } from './useSupabaseAuth';

// ========================================
// API Consumption Hooks (Existing)
// ========================================

/**
 * Item Groups Hooks
 * Manages backlog groups and items with search/filter capabilities
 */
export {
  useItemGroups,
  useGroupsByCategory,
  useItemGroup,
  useGroupItems,
  useCreateItemGroup,
  useSyncBacklogData,
  itemGroupsKeys,
  type StoredBacklogItem,
  type StoredBacklogGroup,
  type GridItem,
  type ListSession,
  type SessionProgress,
  type ComparisonState,
} from './use-item-groups';

/**
 * Top Lists Hooks
 * Manages ranked lists creation, updates, and analytics
 */
export {
  useTopLists,
  useTopList,
  useUserLists,
  usePredefinedLists,
  useListAnalytics,
  useVersionComparison,
  useCreateListWithUser,
  useCreateList,
  useUpdateList,
  useDeleteList,
  useCloneList,
  useInvalidateListsCache,
} from './use-top-lists';

/**
 * List Preview Hook
 * Lazy-loads list preview data on hover with caching
 */
export {
  useListPreview,
  usePrefetchListPreview,
} from './use-list-preview';

/**
 * Play List Hook
 * Consolidates handlePlayList logic for navigating to match interface
 * Used by FeaturedListsSection and UserListsSection
 */
export {
  usePlayList,
} from './use-play-list';

/**
 * Item Research Hooks
 * Handles AI-powered item validation and research
 */
export {
  useItemResearch,
  useItemValidation,
  useItemResearchFlow,
  type UseItemResearchOptions,
} from './use-item-research';

// ========================================
// UI/UX Hooks (Existing)
// ========================================

/**
 * Media Query Hook
 * Tracks media query matches for responsive behavior
 */
export {
  useMediaQuery,
  useIsMobile,
  useIsSmallTablet,
  useIsTablet,
  useIsDesktop,
  useIsSmallScreen,
  useIsMediumScreen,
} from './useMediaQuery';

/**
 * Backlog Filtering Hook
 * Manages search, filters, and sorting for backlog items
 */
export {
  useBacklogFiltering,
} from './use-backlog-filtering';

/**
 * Backlog Selectors Hook
 * Provides memoized selectors for backlog state
 */
export {
  useBacklogSelectors,
} from './use-backlog-selectors';

/**
 * Toast Notifications Hook
 * Provides toast notification functionality
 */
export {
  useToast,
  toast,
} from './use-toast';

/**
 * Consensus Ranking Hooks
 * Transforms backlog into a living consensus engine where items
 * show global ranking distributions and peer consensus overlays
 */
export {
  useConsensus,
  useItemConsensusUI,
  useConsensusSortedItems,
} from './use-consensus';

// ========================================
// Authentication Hooks (Legacy/Clerk)
// ========================================

/**
 * Clerk User Hook
 * Manages Clerk authentication state
 * NOTE: Being migrated to useSupabaseAuth
 */
export {
  useClerkUser,
} from './use-clerk-user';

/**
 * Temporary User Hook
 * Manages temporary/anonymous user sessions
 */
export {
  useTempUser,
} from './use-temp-user';

// ========================================
// Media & Sharing Hooks
// ========================================

/**
 * Screen Capture Hook
 * Captures screenshots for social sharing
 */
export {
  useScreenCapture,
} from './useScreenCapture';

/**
 * Twitter Share Hook
 * Generates Twitter share URLs with images
 */
export {
  useTwitterShare,
} from './useTwitterShare';

// ========================================
// UI/State Management Hooks
// ========================================

/**
 * Loading State Machine Hook
 * Manages complex loading states with error handling and recovery
 */
export {
  useLoadingStateMachine,
  categorizeHttpError,
  createRetryRecoveryAction,
  isLoadingState,
  isErrorState,
  isSuccessState,
  isIdleState,
  type LoadingState,
  type LoadingAction,
  type LoadingStateType,
  type ErrorType,
  type ErrorMetadata,
  type UseLoadingStateMachineReturn,
} from './useLoadingStateMachine';

/**
 * Swipe Gesture Hook
 * Mobile-optimized swipe gesture detection with velocity and distance tracking
 */
export {
  useSwipeGesture,
} from './useSwipeGesture';

export type {
  SwipeDirection,
  SwipeEvent,
  TouchPosition,
  SwipeConfig,
  SwipeCallbacks,
} from './useSwipeGesture.types';

/**
 * Motion Preference Hook
 * 3-tier motion intensity system: Full, Reduced, Minimal
 * Replaces binary prefers-reduced-motion with granular control
 */
export {
  useMotionPreference,
  useMotionCapabilities,
  useMotionProps,
  useMotionDuration,
  getMotionCapabilities,
} from './use-motion-preference';

export type {
  MotionTier,
  MotionCapabilities,
} from './use-motion-preference';

// ========================================
// Performance & Deferred Loading Hooks
// ========================================

/**
 * Deferred Render Hook
 * Defers component rendering until after initial paint for better perceived performance
 */
export {
  useDeferredRender,
  useDeferredValue,
  useAfterPaint,
} from './use-deferred-render';

// ========================================
// API Caching & Performance Hooks
// ========================================

/**
 * API Cache Hooks
 * Intelligent caching layer for API responses with metrics and invalidation
 */
export {
  useCacheMetrics,
  useCacheInvalidation,
  useCachePrefetch,
  useCacheStatus,
  useAPICache,
} from './use-api-cache';

// ========================================
// Migration Notes
// ========================================
/**
 * MIGRATION PATH: HTTP API → Supabase
 *
 * Components should gradually migrate from:
 *
 * OLD PATTERN (HTTP API):
 * ```tsx
 * import { useItemGroups } from '@/hooks';
 *
 * const { data, isLoading } = useItemGroups({
 *   category: 'movies'
 * });
 * ```
 *
 * NEW PATTERN (Supabase):
 * ```tsx
 * import { useSupabaseQuery } from '@/hooks';
 *
 * const { data, isLoading } = useSupabaseQuery(
 *   ['item-groups', category],
 *   async (client) => {
 *     const { data, error } = await client
 *       .from('item_groups')
 *       .select('*')
 *       .eq('category', category);
 *
 *     if (error) throw error;
 *     return data;
 *   }
 * );
 * ```
 *
 * BENEFITS OF MIGRATION:
 * - Real-time subscriptions for collaborative features
 * - Built-in authentication with RLS
 * - Automatic TypeScript types from schema
 * - Better error handling and retries
 * - Optimistic updates with rollback
 * - No separate backend API needed
 *
 * MIGRATION STEPS:
 * 1. Set up Supabase configuration in .env.local
 * 2. Create database schema matching existing API
 * 3. Update one feature module at a time
 * 4. Test thoroughly before moving to next module
 * 5. Remove legacy HTTP API hooks after complete migration
 */

// ========================================
// Hook Usage Guidelines
// ========================================
/**
 * BEST PRACTICES:
 *
 * 1. Query vs Mutation:
 *    - Use useSupabaseQuery for GET operations (read data)
 *    - Use useSupabaseMutation for POST/PUT/DELETE (write data)
 *
 * 2. Query Keys:
 *    - Use descriptive, hierarchical query keys
 *    - Include all dependencies in query key array
 *    - Example: ['item-groups', category, subcategory, searchTerm]
 *
 * 3. Error Handling:
 *    - Always provide onError callbacks for mutations
 *    - Use toast notifications for user feedback
 *    - Log errors for debugging
 *
 * 4. Loading States:
 *    - Show loading indicators during data fetching
 *    - Disable buttons during mutations
 *    - Provide fallback UI for empty states
 *
 * 5. Optimistic Updates:
 *    - Use for better UX on mutations
 *    - Always provide rollback on error
 *    - Test edge cases thoroughly
 *
 * 6. Authentication:
 *    - Check isAuthenticated before protected operations
 *    - Handle session expiration gracefully
 *    - Redirect to login when needed
 */
