/**
 * Composition to API Mapping Types
 *
 * This module provides backward-compatible types and functions for
 * transforming composition data to API requests.
 *
 * @deprecated Prefer using ListIntent types from @/types/list-intent
 * and transformation utilities from @/types/list-intent-transformers
 */

// Re-export from the new unified ListIntent system
export { mapCompositionToCreateListRequest } from './list-intent-transformers';
export type {
  CreateListRequest as CreateListRequestFromComposition,
  LegacyCompositionData as CompositionData,
  ListMetadata as CompositionMetadata,
} from './list-intent-transformers';

// Re-export ListIntent types for migration path
export type {
  ListIntent,
  ListIntentColor,
  ListIntentTimePeriod,
} from './list-intent';

export {
  listIntentToCreateRequest,
  listIntentToMetadata,
  generateListTitle,
  generateListDescription,
} from './list-intent-transformers';

/**
 * Result of a composition operation
 */
export interface CompositionResult {
  success: boolean;
  listId?: string;
  message: string;
  redirectUrl?: string;
  error?: string;
}