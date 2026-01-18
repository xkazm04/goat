/**
 * Type-safe modal props using discriminated unions
 *
 * These types enforce correct prop combinations at compile time,
 * preventing invalid states like isOpen=true without required data.
 */

import type { BacklogItemType, GridItemType } from './match';

// ============================================================================
// Base Modal State Types
// ============================================================================

/**
 * Base state for all modals - closed state requires no data
 */
interface ModalClosedState {
  isOpen: false;
  onClose: () => void;
}

// ============================================================================
// Comparison Modal Types
// ============================================================================

/**
 * Comparison modal in closed state
 */
interface ComparisonModalClosedProps extends ModalClosedState {
  items?: BacklogItemType[];
}

/**
 * Comparison modal in open state - items array is required
 */
interface ComparisonModalOpenProps {
  isOpen: true;
  onClose: () => void;
  items: BacklogItemType[];
}

/**
 * Discriminated union for ComparisonModal props
 * When isOpen=true, items must be provided
 */
export type ComparisonModalProps =
  | ComparisonModalClosedProps
  | ComparisonModalOpenProps;

// ============================================================================
// Result Image Generator Types
// ============================================================================

/**
 * Required metadata for generating result images
 */
export interface ResultImageListMetadata {
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  timePeriod?: string;
  selectedDecade?: number;
  selectedYear?: number;
}

/**
 * Result image generator in closed state
 */
interface ResultImageGeneratorClosedProps extends ModalClosedState {
  gridItems?: GridItemType[];
  listMetadata?: ResultImageListMetadata;
}

/**
 * Result image generator in open state - grid items and metadata required
 */
interface ResultImageGeneratorOpenProps {
  isOpen: true;
  onClose: () => void;
  gridItems: GridItemType[];
  listMetadata: ResultImageListMetadata;
}

/**
 * Discriminated union for ResultImageGenerator props
 * When isOpen=true, gridItems and listMetadata must be provided
 */
export type ResultImageGeneratorProps =
  | ResultImageGeneratorClosedProps
  | ResultImageGeneratorOpenProps;

// ============================================================================
// Result Image Download Types
// ============================================================================

/**
 * Minimal metadata required for downloading result images
 */
export interface ResultImageDownloadMetadata {
  title: string;
  category: string;
  subcategory?: string;
  size: number;
}

/**
 * Result image download in closed state
 */
interface ResultImageDownloadClosedProps extends ModalClosedState {
  imageUrl?: string;
  metadata?: ResultImageDownloadMetadata;
}

/**
 * Result image download in open state - image URL and metadata required
 */
interface ResultImageDownloadOpenProps {
  isOpen: true;
  onClose: () => void;
  imageUrl: string;
  metadata: ResultImageDownloadMetadata;
}

/**
 * Discriminated union for ResultImageDownload props
 * When isOpen=true, imageUrl and metadata must be provided
 */
export type ResultImageDownloadProps =
  | ResultImageDownloadClosedProps
  | ResultImageDownloadOpenProps;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if modal is in open state
 */
export function isModalOpen<T extends { isOpen: boolean }>(
  props: T
): props is T & { isOpen: true } {
  return props.isOpen === true;
}

/**
 * Type guard for ComparisonModal open state
 */
export function isComparisonModalOpen(
  props: ComparisonModalProps
): props is ComparisonModalOpenProps {
  return props.isOpen === true;
}

/**
 * Type guard for ResultImageGenerator open state
 */
export function isResultImageGeneratorOpen(
  props: ResultImageGeneratorProps
): props is ResultImageGeneratorOpenProps {
  return props.isOpen === true;
}

/**
 * Type guard for ResultImageDownload open state
 */
export function isResultImageDownloadOpen(
  props: ResultImageDownloadProps
): props is ResultImageDownloadOpenProps {
  return props.isOpen === true;
}

// ============================================================================
// Helper Types for Component Implementation
// ============================================================================

/**
 * Extract the open state props from a discriminated union modal type
 */
export type OpenStateProps<T extends { isOpen: boolean }> = Extract<
  T,
  { isOpen: true }
>;

/**
 * Extract the closed state props from a discriminated union modal type
 */
export type ClosedStateProps<T extends { isOpen: boolean }> = Extract<
  T,
  { isOpen: false }
>;

/**
 * Make all props required when modal is open
 * This utility type helps ensure consistent prop handling
 */
export type RequiredWhenOpen<
  TBase extends { isOpen: boolean },
  TRequired extends keyof TBase
> = TBase extends { isOpen: true }
  ? TBase & Required<Pick<TBase, TRequired>>
  : TBase;

// ============================================================================
// Store-Connected Comparison Modal Types
// ============================================================================

/**
 * Props for store-connected ComparisonModal that gets items from useComparisonStore
 * This is a simpler interface since items come from the store, not props
 */
export interface StoreConnectedComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}
