/**
 * Unified Feedback Pipeline
 *
 * A generic abstraction for async operations with visual feedback loops.
 * Unifies state indicators, drag feedback, and result generation into
 * a single consistent pattern: show → process → complete → action.
 *
 * @example
 * ```tsx
 * import { useFeedbackPipeline, FeedbackModal, FeedbackLoadingState } from '@/lib/feedback-pipeline';
 *
 * function MyComponent() {
 *   const { state, execute, isProcessing, result, error } = useFeedbackPipeline({
 *     id: 'my-operation',
 *     operation: async (data) => await doSomething(data),
 *     onSuccess: (result) => console.log('Done!', result),
 *   });
 *
 *   return (
 *     <FeedbackModal isOpen={isOpen} onClose={onClose} title="My Modal">
 *       {isProcessing ? (
 *         <FeedbackLoadingState message="Processing..." />
 *       ) : (
 *         <div>Content here</div>
 *       )}
 *     </FeedbackModal>
 *   );
 * }
 * ```
 */

// Types
export type {
  FeedbackState,
  ExtendedFeedbackState,
  FeedbackProgressData,
  FeedbackVisuals,
  FeedbackPipelineConfig,
  FeedbackPipelineResult,
  FeedbackModalProps,
  StateIndicatorConfig,
  ParticleConfig,
  ParticleGenerator,
} from './types';

// Hook
export { useFeedbackPipeline } from './useFeedbackPipeline';

// Components
export {
  FeedbackStateIndicator,
  FeedbackProgress,
  FeedbackParticles,
  generateParticles,
  FeedbackModal,
  FeedbackEmptyState,
  FeedbackLoadingState,
  FeedbackErrorState,
  FeedbackSuccessState,
} from './components';
