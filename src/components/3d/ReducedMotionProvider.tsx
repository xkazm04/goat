'use client';

/**
 * ReducedMotionProvider - Accessibility wrapper for motion preferences
 *
 * Provides context for managing motion preferences across the component tree.
 * Automatically respects system preferences (prefers-reduced-motion) and
 * allows users to override with custom settings.
 */

import {
  createContext,
  useContext,
  memo,
  type ReactNode,
} from 'react';
import {
  useMotionPreference,
  useMotionCapabilities,
  type MotionTier,
  type MotionCapabilities,
} from '@/hooks/use-motion-preference';

// =============================================================================
// Types
// =============================================================================

export interface ReducedMotionContextValue {
  /** Current motion tier */
  tier: MotionTier;
  /** Set the motion tier */
  setTier: (tier: MotionTier) => void;
  /** Reset to system preference */
  resetToSystem: () => void;
  /** Motion capabilities for current tier */
  capabilities: MotionCapabilities;
  /** Whether using system preference */
  isSystemPreference: boolean;
  /** Whether motion is reduced or minimal */
  isReducedMotion: boolean;
  /** Whether all motion is disabled */
  isNoMotion: boolean;
}

export interface ReducedMotionProviderProps {
  children: ReactNode;
  /** Force a specific tier (overrides user preference) */
  forceTier?: MotionTier;
}

// =============================================================================
// Context
// =============================================================================

const ReducedMotionContext = createContext<ReducedMotionContextValue | null>(null);

/**
 * Hook to access reduced motion context
 * Falls back to direct hook if used outside provider
 */
export function useReducedMotion(): ReducedMotionContextValue {
  const context = useContext(ReducedMotionContext);

  // Fallback: use hooks directly if no provider
  const { tier, setTier, resetToSystem, capabilities, isSystemPreference } =
    useMotionPreference();

  if (context) {
    return context;
  }

  // Compute derived values
  const isReducedMotion = tier === 'reduced' || tier === 'minimal';
  const isNoMotion = tier === 'minimal';

  return {
    tier,
    setTier,
    resetToSystem,
    capabilities,
    isSystemPreference,
    isReducedMotion,
    isNoMotion,
  };
}

// =============================================================================
// Provider Component
// =============================================================================

export const ReducedMotionProvider = memo(function ReducedMotionProvider({
  children,
  forceTier,
}: ReducedMotionProviderProps) {
  const { tier: userTier, setTier, resetToSystem, isSystemPreference } =
    useMotionPreference();

  // Use forced tier if provided, otherwise user preference
  const effectiveTier = forceTier ?? userTier;
  const capabilities = useMotionCapabilities();

  // Compute derived values
  const isReducedMotion = effectiveTier === 'reduced' || effectiveTier === 'minimal';
  const isNoMotion = effectiveTier === 'minimal';

  const value: ReducedMotionContextValue = {
    tier: effectiveTier,
    setTier,
    resetToSystem,
    capabilities,
    isSystemPreference: forceTier ? false : isSystemPreference,
    isReducedMotion,
    isNoMotion,
  };

  return (
    <ReducedMotionContext.Provider value={value}>
      {children}
    </ReducedMotionContext.Provider>
  );
});

// =============================================================================
// Utility Components
// =============================================================================

export interface MotionGateProps {
  children: ReactNode;
  /** Show children only when this capability is allowed */
  requires: keyof MotionCapabilities;
  /** Fallback to render when capability is not allowed */
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on motion capabilities
 *
 * @example
 * ```tsx
 * <MotionGate requires="allowCelebrations" fallback={<span>🎉</span>}>
 *   <Confetti />
 * </MotionGate>
 * ```
 */
export const MotionGate = memo(function MotionGate({
  children,
  requires,
  fallback = null,
}: MotionGateProps) {
  const { capabilities } = useReducedMotion();

  if (capabilities[requires]) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
});

export interface NoMotionWrapperProps {
  children: ReactNode;
  /** Tier to force for children */
  tier?: MotionTier;
}

/**
 * Wrapper that forces a specific motion tier for children
 * Useful for disabling animations in specific sections
 *
 * @example
 * ```tsx
 * <NoMotionWrapper tier="minimal">
 *   <HeavyAnimatedComponent />
 * </NoMotionWrapper>
 * ```
 */
export const NoMotionWrapper = memo(function NoMotionWrapper({
  children,
  tier = 'minimal',
}: NoMotionWrapperProps) {
  return (
    <ReducedMotionProvider forceTier={tier}>
      {children}
    </ReducedMotionProvider>
  );
});

export default ReducedMotionProvider;
