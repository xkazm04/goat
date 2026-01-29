"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useMotionCapabilities, type MotionCapabilities } from "./use-motion-preference";

// ===== Page Visibility API =====
// Uses useSyncExternalStore for optimal performance

function subscribeToVisibility(callback: () => void): () => void {
  if (typeof document === "undefined") return () => {};

  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

function getVisibilitySnapshot(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

function getVisibilityServerSnapshot(): boolean {
  return true; // Assume visible on server
}

/**
 * Hook to detect if the page/tab is currently visible
 * Uses the Page Visibility API
 *
 * @returns boolean - true if the page is visible, false if hidden
 */
export function usePageVisibility(): boolean {
  return useSyncExternalStore(
    subscribeToVisibility,
    getVisibilitySnapshot,
    getVisibilityServerSnapshot
  );
}

// ===== Intersection Observer Hook =====

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
}

/**
 * Hook to detect if an element is visible in the viewport
 * Uses IntersectionObserver for efficient detection
 *
 * @param options - IntersectionObserver options
 * @returns [ref, isIntersecting] - Ref to attach to element and visibility state
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<T | null>, boolean] {
  const { threshold = 0, rootMargin = "50px", root = null } = options;
  const ref = useRef<T | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(true); // Default to true for SSR

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold, rootMargin, root }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root]);

  return [ref, isIntersecting];
}

// ===== Combined Animation Pause Hook =====

export interface AnimationPauseState {
  /** Whether animations should be playing (not paused) */
  shouldAnimate: boolean;
  /** Whether the page/tab is visible */
  isPageVisible: boolean;
  /** Whether the element is in viewport */
  isInViewport: boolean;
  /** Motion capabilities from 3-tier preference system */
  motionCapabilities: MotionCapabilities;
  /** Ref to attach to the container element */
  ref: React.RefObject<HTMLDivElement | null>;
  /** CSS class to apply for animation state */
  animationClass: string;
}

interface UseAnimationPauseOptions {
  /** Viewport margin for early animation trigger */
  rootMargin?: string;
  /** Intersection threshold for visibility */
  threshold?: number;
}

/**
 * Comprehensive hook for pausing animations based on:
 * 1. Page Visibility API (tab hidden)
 * 2. IntersectionObserver (element off-screen)
 * 3. 3-tier motion preference system (full/reduced/minimal)
 *
 * Returns a combined state that indicates if animations should play
 * and provides CSS classes for animation state control.
 *
 * @example
 * ```tsx
 * const { ref, shouldAnimate, animationClass, motionCapabilities } = useAnimationPause();
 *
 * return (
 *   <div ref={ref} className={animationClass}>
 *     {shouldAnimate && motionCapabilities.allowAmbient && <AmbientAnimation />}
 *     {shouldAnimate && motionCapabilities.allowFeedback && <FeedbackAnimation />}
 *   </div>
 * );
 * ```
 */
export function useAnimationPause(
  options: UseAnimationPauseOptions = {}
): AnimationPauseState {
  const { rootMargin = "100px", threshold = 0 } = options;

  const isPageVisible = usePageVisibility();
  const motionCapabilities = useMotionCapabilities();
  const [ref, isInViewport] = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    threshold,
  });

  // Animation should play only when:
  // 1. Page is visible (tab is active)
  // 2. Element is in viewport (or near it)
  // 3. Motion tier allows some animations
  const shouldAnimate = isPageVisible && isInViewport && motionCapabilities.allowTransitions;

  // Provide CSS class for styling control
  const animationClass = shouldAnimate
    ? "animations-playing"
    : "animations-paused";

  return {
    shouldAnimate,
    isPageVisible,
    isInViewport,
    motionCapabilities,
    ref,
    animationClass,
  };
}

/**
 * Lightweight version that only checks page visibility
 * Use when IntersectionObserver overhead isn't needed
 */
export function useSimpleAnimationPause(): {
  shouldAnimate: boolean;
  isPageVisible: boolean;
  motionCapabilities: MotionCapabilities;
} {
  const isPageVisible = usePageVisibility();
  const motionCapabilities = useMotionCapabilities();

  return {
    shouldAnimate: isPageVisible && motionCapabilities.allowTransitions,
    isPageVisible,
    motionCapabilities,
  };
}
