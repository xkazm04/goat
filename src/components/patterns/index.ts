/**
 * Component Patterns Library
 *
 * A collection of reusable interaction patterns extracted from the codebase.
 * These patterns provide consistent, well-tested implementations for common
 * UI interactions.
 *
 * @example
 * ```tsx
 * // Drag and Drop
 * import { useVelocityTracking, useMagneticSnap, useGravityWells } from '@/components/patterns/drag-drop';
 *
 * // Badges
 * import { Badge, PositionBadge, TierIndicator } from '@/components/patterns/badges';
 *
 * // Virtualization
 * import { useIntersectionObserver, useLazyLoad, LazyLoadTrigger } from '@/components/patterns/virtualization';
 * ```
 *
 * ## Pattern Categories
 *
 * ### Drag & Drop (`/drag-drop`)
 * Physics-based drag interactions with velocity tracking, gravity wells,
 * and magnetic snap behavior for polished UX.
 *
 * ### Badges (`/badges`)
 * Rank indicators, tier badges, and status markers with consistent styling
 * for Gold/Silver/Bronze positions and consensus tiers.
 *
 * ### Virtualization (`/virtualization`)
 * Efficient rendering of large lists with lazy loading, intersection
 * observer hooks, and infinite scroll triggers.
 */

// Drag & Drop patterns
export * from './drag-drop';

// Badge patterns
export * from './badges';

// Virtualization patterns
export * from './virtualization';
