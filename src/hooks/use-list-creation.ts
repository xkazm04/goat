/**
 * List Creation Hook
 *
 * React hook wrapper for the unified ListCreationService.
 * Provides a consistent interface for list creation across all UI components.
 *
 * Features:
 * - Automatic user ID handling via useTempUser
 * - Progress state management
 * - Toast notifications
 * - Navigation after creation
 * - Store updates
 */

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTempUser } from './use-temp-user';
import { useListStore } from '@/stores/use-list-store';
import { toast } from './use-toast';
import {
  ListCreationService,
  listCreationService,
  CreationStep,
  ListCreationResult,
  ListCreationOptions,
} from '@/services/list-creation-service';
import {
  ListIntent,
  createListIntent,
  updateListIntent,
} from '@/types/list-intent';
import {
  validateListIntentComplete,
  ListIntentValidationResult,
  ValidationContext,
} from '@/lib/validation/list-intent-validator';
import { listIntentToMetadata } from '@/types/list-intent-transformers';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for the useListCreation hook
 */
export interface UseListCreationOptions {
  /** Initial intent (optional) */
  initialIntent?: Partial<ListIntent>;
  /** Called after successful creation */
  onSuccess?: (result: ListCreationResult) => void;
  /** Called after failed creation */
  onError?: (error: string) => void;
  /** Whether to navigate after creation (default: true) */
  autoNavigate?: boolean;
  /** Whether to show toast notifications (default: true) */
  showToasts?: boolean;
  /** Whether to update the list store (default: true) */
  updateStore?: boolean;
  /** Custom validation context */
  validationContext?: ValidationContext;
}

/**
 * Return type for useListCreation hook
 */
export interface UseListCreationReturn {
  // State
  intent: ListIntent;
  creationStep: CreationStep;
  isCreating: boolean;
  isReady: boolean;
  validation: ListIntentValidationResult;

  // Actions
  setIntent: (intent: ListIntent) => void;
  updateIntent: (updates: Partial<ListIntent>) => void;
  resetIntent: () => void;
  createList: () => Promise<ListCreationResult>;
  cancel: () => void;

  // Validation
  validate: () => ListIntentValidationResult;
  isValid: boolean;

  // Service reference
  service: ListCreationService;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Unified hook for list creation
 *
 * Usage:
 * ```tsx
 * const {
 *   intent,
 *   updateIntent,
 *   createList,
 *   isCreating,
 *   isValid,
 *   creationStep,
 * } = useListCreation({
 *   onSuccess: (result) => console.log('Created:', result.listId),
 * });
 *
 * // Update intent from UI
 * updateIntent({ category: 'Music', subcategory: 'Hip Hop' });
 *
 * // Create list
 * <button onClick={createList} disabled={!isValid || isCreating}>
 *   {isCreating ? 'Creating...' : 'Create List'}
 * </button>
 * ```
 */
export function useListCreation(
  options: UseListCreationOptions = {}
): UseListCreationReturn {
  const {
    initialIntent,
    onSuccess,
    onError,
    autoNavigate = true,
    showToasts = true,
    updateStore = true,
    validationContext,
  } = options;

  const router = useRouter();
  const { tempUserId, isLoaded } = useTempUser();
  const { setCurrentList, setCreationResult, setIsCreating, setCreationError } =
    useListStore();

  // Service reference
  const serviceRef = useRef(listCreationService);

  // State
  const [intent, setIntentState] = useState<ListIntent>(() =>
    createListIntent(initialIntent)
  );
  const [creationStep, setCreationStep] = useState<CreationStep>('idle');

  // Derived state
  const isCreating = creationStep !== 'idle' && creationStep !== 'complete' && creationStep !== 'error';
  const isReady = isLoaded && !!tempUserId;
  const validation = validateListIntentComplete(intent, validationContext);
  const isValid = validation.isValid;

  // Intent management
  const setIntent = useCallback((newIntent: ListIntent) => {
    setIntentState(newIntent);
  }, []);

  const updateIntentFn = useCallback((updates: Partial<ListIntent>) => {
    setIntentState((current) => updateListIntent(current, updates));
  }, []);

  const resetIntent = useCallback(() => {
    setIntentState(createListIntent(initialIntent));
    setCreationStep('idle');
  }, [initialIntent]);

  // Validation
  const validate = useCallback((): ListIntentValidationResult => {
    return validateListIntentComplete(intent, validationContext);
  }, [intent, validationContext]);

  // Cancel creation
  const cancel = useCallback(() => {
    serviceRef.current.cancel();
    setCreationStep('idle');
  }, []);

  // Create list
  const createListFn = useCallback(async (): Promise<ListCreationResult> => {
    // Check if ready
    if (!isReady || !tempUserId) {
      const error = 'Please wait while we prepare your session...';
      if (showToasts) {
        toast({
          title: 'Not Ready',
          description: error,
        });
      }
      return { success: false, error };
    }

    // Update store state
    if (updateStore) {
      setIsCreating(true);
      setCreationError(null);
    }

    // Progress callback
    const onProgress = (step: CreationStep) => {
      setCreationStep(step);
    };

    // Execute creation
    const result = await serviceRef.current.createList(intent, {
      userId: tempUserId,
      onProgress,
      validationContext,
    });

    // Handle result
    if (result.success && result.list) {
      // Update store with enhanced list data
      if (updateStore) {
        const enhancedListData = {
          ...result.list,
          metadata: result.metadata,
        };

        // Convert API user shape to store UserInfo shape
        const userInfo = result.user
          ? {
              id: result.user.id,
              is_temporary: result.isNewUser ?? false,
              email: result.user.email,
              display_name: result.user.name,
            }
          : { id: '', is_temporary: true };

        setCreationResult({
          list: enhancedListData,
          user: userInfo,
          is_new_user: result.isNewUser ?? false,
          success: true,
        });

        setCurrentList(enhancedListData);
      }

      // Show success toast
      if (showToasts) {
        toast({
          title: 'List Created!',
          description: `"${result.list.title}" is ready for ranking!`,
        });
      }

      // Navigate
      if (autoNavigate && result.listId) {
        router.push(`/match-test?list=${result.listId}`);
      }

      // Callback
      onSuccess?.(result);
    } else {
      // Update store with error
      if (updateStore) {
        setCreationError(result.error || 'Failed to create list');
      }

      // Show error toast
      if (showToasts) {
        toast({
          title: 'Creation Failed',
          description: result.error || 'Failed to create list',
        });
      }

      // Callback
      if (result.error) {
        onError?.(result.error);
      }
    }

    // Reset creating state in store
    if (updateStore) {
      setIsCreating(false);
    }

    return result;
  }, [
    isReady,
    tempUserId,
    intent,
    validationContext,
    showToasts,
    updateStore,
    autoNavigate,
    router,
    setIsCreating,
    setCreationError,
    setCreationResult,
    setCurrentList,
    onSuccess,
    onError,
  ]);

  return {
    // State
    intent,
    creationStep,
    isCreating,
    isReady,
    validation,

    // Actions
    setIntent,
    updateIntent: updateIntentFn,
    resetIntent,
    createList: createListFn,
    cancel,

    // Validation
    validate,
    isValid,

    // Service reference
    service: serviceRef.current,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for quick list creation from a preset
 *
 * Usage:
 * ```tsx
 * const { createFromPreset, isCreating } = useQuickCreate();
 *
 * // Create from preset click
 * <PresetCard onClick={() => createFromPreset(preset)} />
 * ```
 */
export function useQuickCreate(options: UseListCreationOptions = {}) {
  const hook = useListCreation(options);

  const createFromPreset = useCallback(
    async (preset: Partial<ListIntent>) => {
      hook.setIntent(createListIntent({ ...preset, isPredefined: true, source: 'preset' }));
      return hook.createList();
    },
    [hook]
  );

  return {
    ...hook,
    createFromPreset,
  };
}

/**
 * Hook for list creation from command palette queries
 *
 * Usage:
 * ```tsx
 * const { createFromQuery, isCreating } = useCommandPaletteCreate();
 *
 * // Create from query
 * await createFromQuery('top 10 action movies 2024');
 * ```
 */
export function useCommandPaletteCreate(options: UseListCreationOptions = {}) {
  const hook = useListCreation(options);

  const createFromQuery = useCallback(
    async (
      query: string,
      parsedQuery: {
        category: string;
        subcategory?: string;
        hierarchy: number;
        timePeriod: 'all-time' | 'decade' | 'year';
        decade?: string;
        year?: string;
      },
      colors?: { primary: string; secondary: string; accent: string }
    ) => {
      const intent = createListIntent({
        category: parsedQuery.category,
        subcategory: parsedQuery.subcategory,
        size: parsedQuery.hierarchy,
        timePeriod: parsedQuery.timePeriod,
        selectedDecade: parsedQuery.decade,
        selectedYear: parsedQuery.year,
        color: colors || {
          primary: '#f59e0b',
          secondary: '#d97706',
          accent: '#fbbf24',
        },
        isPredefined: true,
        source: 'create',
      });

      hook.setIntent(intent);
      return hook.createList();
    },
    [hook]
  );

  return {
    ...hook,
    createFromQuery,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default useListCreation;
