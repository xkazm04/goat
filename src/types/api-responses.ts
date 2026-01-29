/**
 * API Response Types
 *
 * Provides type-safe response shapes for API routes and frontend consumption.
 * All API responses follow a consistent structure for error handling.
 */

import type { ErrorCategory, ErrorCode, ErrorDetails } from '@/lib/errors/types';

// =============================================================================
// Base Response Types
// =============================================================================

/**
 * Successful API response wrapper
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Error API response wrapper (re-exported from errors for convenience)
 */
export interface ApiErrorResponse {
  success: false;
  category: ErrorCategory;
  code: ErrorCode;
  message: string;
  status: number;
  details?: ErrorDetails;
}

/**
 * Union type for any API response
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ApiErrorResponse;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Check if a response is an error
 */
export function isErrorResponse(response: ApiResponse<unknown>): response is ApiErrorResponse {
  return response.success === false;
}

// =============================================================================
// Blueprint API Response Types
// =============================================================================

import type { Blueprint } from '@/types/blueprint';

/**
 * GET /api/blueprints response
 */
export type BlueprintsListResponse = ApiResponse<Blueprint[]>;

/**
 * GET /api/blueprints/[slugOrId] response
 */
export type BlueprintResponse = ApiResponse<Blueprint>;

/**
 * POST /api/blueprints response
 */
export interface BlueprintCreateData {
  blueprint: Blueprint;
  shareUrl: string;
}
export type BlueprintCreateResponse = ApiResponse<BlueprintCreateData>;

/**
 * POST /api/blueprints/[slugOrId]/clone response
 */
export interface BlueprintCloneData {
  list: {
    id: string;
    title: string;
    category: string;
    subcategory?: string | null;
    size: number;
    time_period?: string | null;
    user_id?: string | null;
  };
  blueprint: Blueprint;
}
export type BlueprintCloneResponse = ApiResponse<BlueprintCloneData>;

// =============================================================================
// List API Response Types
// =============================================================================

import type { ListRow } from '@/types/database';

/**
 * List data type for API responses
 */
export interface ListData {
  id: string;
  title: string;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  size: number;
  time_period?: string | null;
  user_id?: string | null;
  is_public?: boolean;
  featured?: boolean;
  total_items?: number | null;
  created_at: string;
  updated_at?: string;
  type?: 'top' | 'award';
  parent_list_id?: string | null;
}

/**
 * GET /api/lists/featured response
 */
export interface FeaturedListsData {
  popular: ListData[];
  trending: ListData[];
  latest: ListData[];
  awards: ListData[];
}
export type FeaturedListsResponse = ApiResponse<FeaturedListsData>;

/**
 * GET /api/lists/[id] response
 */
export type ListResponse = ApiResponse<ListData>;

/**
 * GET /api/lists/[id]?include_items=true response
 */
export interface ListWithItemsData extends ListData {
  items: Array<{
    id: string;
    name?: string;
    title?: string;
    description?: string | null;
    image_url?: string | null;
    category?: string;
    subcategory?: string | null;
    group_id?: string | null;
    item_year?: number | null;
    position: number;
  }>;
}
export type ListWithItemsResponse = ApiResponse<ListWithItemsData>;

/**
 * POST /api/lists/create-with-user response
 */
export interface CreateListWithUserData {
  list: ListData;
  user: {
    id: string;
    is_temporary: boolean;
    email?: string | null;
    display_name?: string | null;
  };
  is_new_user: boolean;
}
export type CreateListWithUserResponse = ApiResponse<CreateListWithUserData>;

/**
 * DELETE /api/lists/[id] response
 */
export interface DeleteSuccessData {
  message: string;
}
export type DeleteListResponse = ApiResponse<DeleteSuccessData>;

// =============================================================================
// Generic CRUD Response Types
// =============================================================================

/**
 * Standard deletion response
 */
export type DeleteResponse = ApiResponse<{ message: string }>;

/**
 * Standard update response (returns updated resource)
 */
export type UpdateResponse<T> = ApiResponse<T>;

/**
 * Standard create response (returns created resource)
 */
export type CreateResponse<T> = ApiResponse<T>;

// =============================================================================
// Error Parsing Utilities (for frontend use)
// =============================================================================

/**
 * Parse an API response and extract the error if present
 */
export function parseApiError(response: ApiResponse<unknown>): ApiErrorResponse | null {
  if (isErrorResponse(response)) {
    return response;
  }
  return null;
}

/**
 * Parse an API response and extract the data if successful
 */
export function parseApiData<T>(response: ApiResponse<T>): T | null {
  if (isSuccessResponse(response)) {
    return response.data;
  }
  return null;
}

/**
 * Extract field errors from an API error response
 */
export function getFieldErrors(response: ApiErrorResponse): Record<string, string[]> {
  return response.details?.fieldErrors || {};
}

/**
 * Check if an error is of a specific category
 */
export function isErrorCategory(
  response: ApiResponse<unknown>,
  category: ErrorCategory
): boolean {
  return isErrorResponse(response) && response.category === category;
}

/**
 * Check if an error is retriable (network or rate limit)
 */
export function isRetriableError(response: ApiResponse<unknown>): boolean {
  if (!isErrorResponse(response)) return false;
  return (
    response.category === 'network' ||
    response.category === 'rate_limit' ||
    response.status === 503 ||
    response.status === 504
  );
}
