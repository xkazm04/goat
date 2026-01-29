/**
 * List Creation Service
 *
 * Unified service for creating lists from any entry point in the application.
 * This service consolidates the scattered list creation flows (CompositionModal,
 * CommandPalette, ListCreateButton) into a single service with shared validation,
 * transformation, and error handling logic.
 *
 * Features:
 * - Single createList() function used by all entry points
 * - Consistent validation via list-intent-validator
 * - Unified transformation pipeline via list-intent-transformers
 * - Standardized error handling with retry logic
 * - Progress tracking for UI feedback
 */

import { ListIntent, createListIntent } from '@/types/list-intent';
import {
  listIntentToCreateRequest,
  listIntentToMetadata,
  generateListTitle,
  generateListDescription,
  ListMetadata,
  CreateListRequest,
} from '@/types/list-intent-transformers';
import {
  validateListIntentComplete,
  ListIntentValidationResult,
  ValidationContext,
} from '@/lib/validation/list-intent-validator';
import { goatApi } from '@/lib/api';
import type { ListCreationResponse } from '@/types/top-lists';
import { useCriteriaStore } from '@/stores/criteria-store';

// ============================================================================
// Types
// ============================================================================

/**
 * Creation step for progress tracking
 */
export type CreationStep =
  | 'idle'
  | 'validating'
  | 'creating'
  | 'loading'
  | 'complete'
  | 'error';

/**
 * Result of a list creation operation
 */
export interface ListCreationResult {
  success: boolean;
  listId?: string;
  list?: ListCreationResponse['list'];
  user?: ListCreationResponse['user'];
  isNewUser?: boolean;
  metadata?: ListMetadata;
  error?: string;
  validationErrors?: string[];
}

/**
 * Options for list creation
 */
export interface ListCreationOptions {
  /** User ID for the list owner */
  userId: string;
  /** Callback for progress updates */
  onProgress?: (step: CreationStep) => void;
  /** Validation context for conditional rules */
  validationContext?: ValidationContext;
  /** Whether to skip validation (use with caution) */
  skipValidation?: boolean;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delayMs: number;
  };
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 2,
  delayMs: 1000,
};

// ============================================================================
// List Creation Service
// ============================================================================

/**
 * Unified List Creation Service
 *
 * Usage:
 * ```typescript
 * const service = new ListCreationService();
 * const result = await service.createList(intent, {
 *   userId: tempUserId,
 *   onProgress: (step) => setCreationStep(step),
 * });
 * ```
 */
export class ListCreationService {
  private abortController: AbortController | null = null;

  /**
   * Create a list from a ListIntent
   *
   * @param intent - The list intent to create from
   * @param options - Creation options including userId and callbacks
   * @returns Promise resolving to the creation result
   */
  async createList(
    intent: ListIntent,
    options: ListCreationOptions
  ): Promise<ListCreationResult> {
    const { userId, onProgress, validationContext, skipValidation, retry } = options;
    const retryConfig = retry || DEFAULT_RETRY_CONFIG;

    // Track progress
    const setProgress = (step: CreationStep) => {
      onProgress?.(step);
    };

    try {
      // Step 1: Validate
      setProgress('validating');

      if (!skipValidation) {
        const validation = this.validateIntent(intent, validationContext);
        if (!validation.isValid) {
          setProgress('error');
          return {
            success: false,
            error: validation.errors.join(', '),
            validationErrors: validation.errors,
          };
        }
      }

      // Step 2: Create list
      setProgress('creating');

      const createRequest = this.transformToRequest(intent, userId);
      const response = await this.executeWithRetry(
        () => goatApi.lists.createWithUser(createRequest),
        retryConfig
      );

      // Step 3: Process response and save criteria if selected
      setProgress('loading');

      const metadata = listIntentToMetadata(intent);

      // Save criteria config if a profile was selected
      if (intent.criteriaProfileId && response.list.id) {
        try {
          const criteriaStore = useCriteriaStore.getState();
          criteriaStore.setActiveProfile(intent.criteriaProfileId);
          await criteriaStore.saveToDatabase(response.list.id);
        } catch (criteriaError) {
          // Log but don't fail list creation if criteria save fails
          console.warn('Failed to save criteria config:', criteriaError);
        }
      }

      // Step 4: Complete
      setProgress('complete');

      return {
        success: true,
        listId: response.list.id,
        list: response.list,
        user: response.user,
        isNewUser: response.is_new_user,
        metadata,
      };
    } catch (error) {
      setProgress('error');

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create list';

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate a ListIntent
   */
  validateIntent(
    intent: ListIntent,
    context?: ValidationContext
  ): ListIntentValidationResult {
    return validateListIntentComplete(intent, context);
  }

  /**
   * Transform a ListIntent to a CreateListRequest
   */
  transformToRequest(intent: ListIntent, userId: string): CreateListRequest {
    return listIntentToCreateRequest(intent, userId);
  }

  /**
   * Generate a title from a ListIntent
   */
  generateTitle(intent: ListIntent): string {
    return generateListTitle(intent);
  }

  /**
   * Generate a description from a ListIntent
   */
  generateDescription(intent: ListIntent): string {
    return generateListDescription(intent);
  }

  /**
   * Generate metadata from a ListIntent
   */
  generateMetadata(intent: ListIntent): ListMetadata {
    return listIntentToMetadata(intent);
  }

  /**
   * Cancel any in-progress creation
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Execute a function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: { maxAttempts: number; delayMs: number }
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on validation errors (4xx)
        if (lastError.message.includes('400') || lastError.message.includes('422')) {
          throw lastError;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < config.maxAttempts) {
          await this.delay(config.delayMs * attempt);
        }
      }
    }

    throw lastError || new Error('Max retry attempts reached');
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default list creation service instance
 */
export const listCreationService = new ListCreationService();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick create list function
 *
 * Convenience function for simple list creation without instantiating the service.
 *
 * @param intent - The list intent
 * @param userId - The user ID
 * @returns Promise resolving to the creation result
 */
export async function createList(
  intent: ListIntent,
  userId: string
): Promise<ListCreationResult> {
  return listCreationService.createList(intent, { userId });
}

/**
 * Create list from partial intent
 *
 * Creates a list from a partial intent specification, using defaults for
 * missing fields.
 */
export async function createListFromPartial(
  partial: Partial<ListIntent>,
  userId: string
): Promise<ListCreationResult> {
  const intent = createListIntent(partial);
  return createList(intent, userId);
}

/**
 * Validate intent before creation
 *
 * Use this to check if an intent is valid before showing a create button.
 */
export function validateIntent(
  intent: ListIntent,
  context?: ValidationContext
): ListIntentValidationResult {
  return listCreationService.validateIntent(intent, context);
}

/**
 * Check if intent is valid
 *
 * Quick boolean check for UI states.
 */
export function isIntentValid(intent: ListIntent): boolean {
  return listCreationService.validateIntent(intent).isValid;
}
