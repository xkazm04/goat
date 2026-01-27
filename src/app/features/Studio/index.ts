/**
 * Studio Feature
 * List Creation Studio with AI-powered item generation
 *
 * Exports:
 * - StudioLayout: Main layout orchestrator for the studio page
 * - StudioSkeleton: Loading skeleton for Suspense fallback
 */

export { StudioLayout } from './StudioLayout';
export { StudioSkeleton } from './components/StudioSkeleton';

// Re-export types for consumers
export type { StudioLayoutProps } from './StudioLayout';
