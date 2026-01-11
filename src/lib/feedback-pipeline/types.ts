/**
 * Unified Feedback Pipeline Types
 *
 * This module provides a generic abstraction for async operations with visual feedback.
 * It unifies state indicators (loading/error/empty), drag feedback, and result generation
 * into a single consistent pattern: show → process → complete → action.
 */

/** Base operation states that apply to all async operations */
export type FeedbackState =
  | 'idle'
  | 'pending'
  | 'processing'
  | 'success'
  | 'error';

/** Extended states for specific use cases */
export type ExtendedFeedbackState =
  | FeedbackState
  | 'checking-cache'
  | 'generating'
  | 'complete'
  | 'dragging'
  | 'dropping'
  | 'empty';

/** Progress information for long-running operations */
export interface FeedbackProgressData {
  /** Current progress (0-100) */
  value: number;
  /** Optional label describing current step */
  label?: string;
  /** Whether progress is indeterminate */
  indeterminate?: boolean;
}

/** Visual feedback configuration */
export interface FeedbackVisuals {
  /** Show particle/sparkle effects */
  particles?: boolean;
  /** Number of particles to generate */
  particleCount?: number;
  /** Show progress bar */
  showProgress?: boolean;
  /** Show success animation */
  successAnimation?: boolean;
  /** Custom background gradient colors */
  gradientColors?: [string, string];
  /** Icon to display */
  icon?: 'spinner' | 'check' | 'error' | 'sparkles' | 'warning' | 'crown';
}

/** Configuration for a feedback pipeline operation */
export interface FeedbackPipelineConfig<TData = unknown, TResult = unknown> {
  /** Unique identifier for the pipeline */
  id: string;
  /** Initial state */
  initialState?: FeedbackState;
  /** The async operation to execute */
  operation?: (data: TData) => Promise<TResult>;
  /** Called when state changes */
  onStateChange?: (state: ExtendedFeedbackState, prevState: ExtendedFeedbackState) => void;
  /** Called on successful completion */
  onSuccess?: (result: TResult) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Visual configuration */
  visuals?: FeedbackVisuals;
  /** Auto-reset to idle after success (ms) */
  autoResetDelay?: number;
  /** Whether to cache results */
  cacheResult?: boolean;
}

/** The result of using the feedback pipeline hook */
export interface FeedbackPipelineResult<TData = unknown, TResult = unknown> {
  /** Current state of the pipeline */
  state: ExtendedFeedbackState;
  /** Current progress (if applicable) */
  progress: FeedbackProgressData | null;
  /** Result data (if successful) */
  result: TResult | null;
  /** Error (if failed) */
  error: Error | null;
  /** Whether operation is currently running */
  isProcessing: boolean;
  /** Whether operation completed successfully */
  isSuccess: boolean;
  /** Whether operation failed */
  isError: boolean;
  /** Whether in idle state */
  isIdle: boolean;
  /** Execute the pipeline operation */
  execute: (data: TData) => Promise<TResult | null>;
  /** Reset the pipeline to idle state */
  reset: () => void;
  /** Set state manually */
  setState: (state: ExtendedFeedbackState) => void;
  /** Update progress manually */
  setProgress: (progress: FeedbackProgressData | null) => void;
}

/** Props for modal components using the pipeline pattern */
export interface FeedbackModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
}

/** Configuration for state indicator components */
export interface StateIndicatorConfig {
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Icon to display */
  icon?: FeedbackVisuals['icon'];
  /** Action button text */
  actionText?: string;
  /** Action callback */
  onAction?: () => void;
  /** Secondary action text */
  secondaryActionText?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
}

/** Particle configuration for visual effects */
export interface ParticleConfig {
  id: number;
  x: number;
  y: number;
  timestamp?: number;
  size?: number;
  color?: string;
  duration?: number;
}

/** Generator function type for particles */
export type ParticleGenerator = (count?: number) => ParticleConfig[];
