/**
 * Match Grid Library Exports
 *
 * Centralized exports for snap-to-grid utilities, drag helpers,
 * physics engine, and haptic feedback.
 *
 * Note: Physics engine primitives (physicsEngine.ts) are used directly by components.
 * The usePhysicsGrid hook provides a higher-level abstraction but is not currently
 * used by SimpleMatchGrid which implements inline velocity tracking for performance.
 */

export * from './snapToGrid';
export * from './helpers';
export * from './physicsEngine';
export * from './hapticFeedback';

// Higher-level physics hook - available but not currently integrated with SimpleMatchGrid
// SimpleMatchGrid uses inline velocityRef tracking for real-time performance
export * from './usePhysicsGrid';
