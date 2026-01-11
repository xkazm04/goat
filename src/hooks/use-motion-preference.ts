"use client";

import { useSyncExternalStore, useCallback, useMemo } from "react";

/**
 * Motion intensity tiers for the 3-tier motion preference system
 *
 * - Full: All animations enabled including ambient decorations, particles, and celebratory effects
 * - Reduced: Essential feedback animations only (drop confirmations, state changes), no ambient decorations
 * - Minimal: Instant transitions, no motion at all - for users who need zero animation
 */
export type MotionTier = "full" | "reduced" | "minimal";

const STORAGE_KEY = "goat-motion-preference";

// Cache for media query
let reducedMotionQuery: MediaQueryList | null = null;

function getReducedMotionQuery(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  if (!reducedMotionQuery) {
    reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  }
  return reducedMotionQuery;
}

// Persistent storage with localStorage
function getStoredPreference(): MotionTier | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "full" || stored === "reduced" || stored === "minimal") {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

function setStoredPreference(tier: MotionTier): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, tier);
    // Dispatch storage event for cross-tab sync
    window.dispatchEvent(new CustomEvent("motion-preference-change", { detail: tier }));
  } catch {
    // Ignore storage errors
  }
}

// Subscribers for useSyncExternalStore
type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(callback: Listener): () => void {
  listeners.add(callback);

  // Listen for storage changes (cross-tab sync)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback();
    }
  };

  // Listen for custom motion preference changes (same tab)
  const handleCustomChange = () => callback();

  // Listen for system preference changes
  const mq = getReducedMotionQuery();

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("motion-preference-change", handleCustomChange);
    mq?.addEventListener("change", callback);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("motion-preference-change", handleCustomChange);
      mq?.removeEventListener("change", callback);
    }
  };
}

function getSnapshot(): MotionTier {
  // Priority: stored preference > system preference > full
  const stored = getStoredPreference();
  if (stored) return stored;

  const mq = getReducedMotionQuery();
  if (mq?.matches) return "reduced";

  return "full";
}

function getServerSnapshot(): MotionTier {
  return "full"; // Default to full animations on server
}

/**
 * Motion capability flags derived from the motion tier
 */
export interface MotionCapabilities {
  /** Whether ambient decorations (particles, floating elements) should animate */
  allowAmbient: boolean;
  /** Whether feedback animations (drop confirmations, success states) should play */
  allowFeedback: boolean;
  /** Whether celebratory effects (confetti, sparkles) should show */
  allowCelebrations: boolean;
  /** Whether smooth transitions should be used (vs instant state changes) */
  allowTransitions: boolean;
  /** Whether hover/interaction animations should play */
  allowInteraction: boolean;
}

/**
 * Get motion capabilities for a given tier
 */
export function getMotionCapabilities(tier: MotionTier): MotionCapabilities {
  switch (tier) {
    case "full":
      return {
        allowAmbient: true,
        allowFeedback: true,
        allowCelebrations: true,
        allowTransitions: true,
        allowInteraction: true,
      };
    case "reduced":
      return {
        allowAmbient: false,
        allowFeedback: true,
        allowCelebrations: false,
        allowTransitions: true,
        allowInteraction: true,
      };
    case "minimal":
      return {
        allowAmbient: false,
        allowFeedback: false,
        allowCelebrations: false,
        allowTransitions: false,
        allowInteraction: false,
      };
  }
}

/**
 * Hook to access and modify the 3-tier motion preference system
 *
 * @returns Current motion tier, setter function, and motion capabilities
 *
 * @example
 * ```tsx
 * const { tier, setTier, capabilities } = useMotionPreference();
 *
 * // Check if ambient animations should play
 * if (capabilities.allowAmbient) {
 *   // Render floating particles
 * }
 *
 * // Allow user to change preference
 * <select value={tier} onChange={(e) => setTier(e.target.value as MotionTier)}>
 *   <option value="full">Full animations</option>
 *   <option value="reduced">Reduced (essential only)</option>
 *   <option value="minimal">Minimal (no motion)</option>
 * </select>
 * ```
 */
export function useMotionPreference() {
  const tier = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTier = useCallback((newTier: MotionTier) => {
    setStoredPreference(newTier);
    // Notify all subscribers
    listeners.forEach(listener => listener());
  }, []);

  const capabilities = useMemo(() => getMotionCapabilities(tier), [tier]);

  const resetToSystem = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      // Notify all subscribers
      listeners.forEach(listener => listener());
    } catch {
      // Ignore storage errors
    }
  }, []);

  return {
    /** Current motion tier */
    tier,
    /** Set the motion tier preference */
    setTier,
    /** Reset to system preference (removes localStorage override) */
    resetToSystem,
    /** Motion capabilities for the current tier */
    capabilities,
    /** Whether using system preference (no localStorage override) */
    isSystemPreference: getStoredPreference() === null,
  };
}

/**
 * Simplified hook that just returns motion capabilities
 * Use when you only need to check what animations are allowed
 */
export function useMotionCapabilities(): MotionCapabilities {
  const tier = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => getMotionCapabilities(tier), [tier]);
}

/**
 * Hook that returns animation props respecting the motion tier
 * Useful for Framer Motion components
 *
 * @param fullProps - Props to use for full tier
 * @param reducedProps - Props to use for reduced tier (optional, defaults to fullProps)
 * @param minimalProps - Props to use for minimal tier (optional, defaults to empty)
 */
export function useMotionProps<T extends object>(
  fullProps: T,
  reducedProps?: T,
  minimalProps?: T
): T | Record<string, never> {
  const { tier } = useMotionPreference();

  return useMemo(() => {
    switch (tier) {
      case "full":
        return fullProps;
      case "reduced":
        return reducedProps ?? fullProps;
      case "minimal":
        return minimalProps ?? ({} as Record<string, never>);
    }
  }, [tier, fullProps, reducedProps, minimalProps]);
}

/**
 * Get the appropriate transition duration based on motion tier
 *
 * @param fullDuration - Duration for full tier (in seconds)
 * @param reducedDuration - Duration for reduced tier (optional, defaults to fullDuration)
 * @returns Appropriate duration or 0 for minimal tier
 */
export function useMotionDuration(fullDuration: number, reducedDuration?: number): number {
  const { tier } = useMotionPreference();

  return useMemo(() => {
    switch (tier) {
      case "full":
        return fullDuration;
      case "reduced":
        return reducedDuration ?? fullDuration;
      case "minimal":
        return 0;
    }
  }, [tier, fullDuration, reducedDuration]);
}
