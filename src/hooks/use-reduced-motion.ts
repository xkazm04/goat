"use client";

import { useSyncExternalStore, useCallback } from "react";

// Cached media query for reduced motion
let mediaQuery: MediaQueryList | null = null;

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  if (!mediaQuery) {
    mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  }
  return mediaQuery;
}

function subscribe(callback: () => void): () => void {
  const mq = getMediaQuery();
  if (!mq) return () => {};

  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  const mq = getMediaQuery();
  return mq?.matches ?? false;
}

function getServerSnapshot(): boolean {
  return false; // Default to animations enabled on server
}

/**
 * Hook to detect user's reduced motion preference
 * Uses the prefers-reduced-motion media query
 *
 * Uses useSyncExternalStore for optimal performance - no re-render on mount
 * unless the preference actually changes.
 *
 * @returns boolean - true if the user prefers reduced motion
 *
 * @example
 * const prefersReducedMotion = useReducedMotion();
 * // Use to conditionally disable animations
 * animate={prefersReducedMotion ? {} : { y: [0, -10, 0] }}
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns animation props that respect reduced motion preference
 * Useful for Framer Motion components
 *
 * @param animationProps - The animation props to use when motion is allowed
 * @returns The animation props or empty object if reduced motion is preferred
 */
export function useMotionSafe<T extends object>(animationProps: T): T | Record<string, never> {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? {} : animationProps;
}
