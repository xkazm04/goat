'use client';

/**
 * useContainerQuery Hook
 * Advanced container query utilities with ResizeObserver integration
 * Provides JS-based container query matching for dynamic component behavior
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { RefObject } from 'react';
import {
  type ContainerBreakpoint,
  CONTAINER_BREAKPOINTS,
  getContainerBreakpointFromWidth,
} from '@/lib/layout/ContainerProvider';

/**
 * Container query match result
 */
export interface ContainerQueryMatch {
  matches: boolean;
  width: number;
  height: number;
  breakpoint: ContainerBreakpoint;
}

/**
 * Container query configuration
 */
export interface ContainerQueryConfig {
  /** Minimum width in pixels or breakpoint name */
  minWidth?: number | ContainerBreakpoint;
  /** Maximum width in pixels or breakpoint name */
  maxWidth?: number | ContainerBreakpoint;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Minimum aspect ratio (width/height) */
  minAspectRatio?: number;
  /** Maximum aspect ratio (width/height) */
  maxAspectRatio?: number;
}

/**
 * Resolve breakpoint to pixel value
 */
function resolveBreakpointValue(value: number | ContainerBreakpoint | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return CONTAINER_BREAKPOINTS[value]?.minWidth;
}

/**
 * Check if dimensions match the query configuration
 */
function matchesQuery(
  width: number,
  height: number,
  config: ContainerQueryConfig
): boolean {
  const minWidth = resolveBreakpointValue(config.minWidth);
  const maxWidth = resolveBreakpointValue(config.maxWidth);

  if (minWidth !== undefined && width < minWidth) return false;
  if (maxWidth !== undefined && width > maxWidth) return false;
  if (config.minHeight !== undefined && height < config.minHeight) return false;
  if (config.maxHeight !== undefined && height > config.maxHeight) return false;

  if (height > 0) {
    const aspectRatio = width / height;
    if (config.minAspectRatio !== undefined && aspectRatio < config.minAspectRatio) return false;
    if (config.maxAspectRatio !== undefined && aspectRatio > config.maxAspectRatio) return false;
  }

  return true;
}

/**
 * useContainerQuery
 * Hook to match container queries using ResizeObserver
 *
 * @param ref - React ref to the container element
 * @param config - Query configuration
 * @returns Container query match result
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { matches, width, breakpoint } = useContainerQuery(containerRef, {
 *   minWidth: 'lg',
 * });
 *
 * return (
 *   <div ref={containerRef}>
 *     {matches ? <DesktopView /> : <MobileView />}
 *   </div>
 * );
 * ```
 */
export function useContainerQuery(
  ref: RefObject<HTMLElement | null>,
  config: ContainerQueryConfig
): ContainerQueryMatch {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return useMemo(() => ({
    matches: matchesQuery(dimensions.width, dimensions.height, config),
    width: dimensions.width,
    height: dimensions.height,
    breakpoint: getContainerBreakpointFromWidth(dimensions.width),
  }), [dimensions, config]);
}

/**
 * useContainerBreakpoint
 * Simplified hook to get current container breakpoint
 *
 * @param ref - React ref to the container element
 * @returns Current container breakpoint
 */
export function useContainerBreakpoint(
  ref: RefObject<HTMLElement | null>
): ContainerBreakpoint {
  const [breakpoint, setBreakpoint] = useState<ContainerBreakpoint>('md');

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setBreakpoint(getContainerBreakpointFromWidth(width));
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return breakpoint;
}

/**
 * useContainerDimensions
 * Hook to track container dimensions with debouncing
 *
 * @param ref - React ref to the container element
 * @param debounceMs - Debounce delay in milliseconds (default: 0)
 * @returns Container dimensions
 */
export function useContainerDimensions(
  ref: RefObject<HTMLElement | null>,
  debounceMs: number = 0
) {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    aspectRatio: 1,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateDimensions = (width: number, height: number) => {
      setDimensions({
        width,
        height,
        aspectRatio: height > 0 ? width / height : 1,
      });
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        if (debounceMs > 0) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            updateDimensions(width, height);
          }, debounceMs);
        } else {
          updateDimensions(width, height);
        }
      }
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [ref, debounceMs]);

  return dimensions;
}

/**
 * useMultipleContainerQueries
 * Hook to match multiple container queries simultaneously
 *
 * @param ref - React ref to the container element
 * @param queries - Object mapping query names to configurations
 * @returns Object mapping query names to match results
 *
 * @example
 * ```tsx
 * const matches = useMultipleContainerQueries(containerRef, {
 *   isNarrow: { maxWidth: 'sm' },
 *   isWide: { minWidth: 'lg' },
 *   isTall: { minHeight: 400 },
 * });
 *
 * if (matches.isNarrow) return <NarrowLayout />;
 * if (matches.isWide && matches.isTall) return <FullLayout />;
 * ```
 */
export function useMultipleContainerQueries<T extends Record<string, ContainerQueryConfig>>(
  ref: RefObject<HTMLElement | null>,
  queries: T
): Record<keyof T, boolean> {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return useMemo(() => {
    const result = {} as Record<keyof T, boolean>;
    for (const key in queries) {
      result[key] = matchesQuery(dimensions.width, dimensions.height, queries[key]);
    }
    return result;
  }, [dimensions, queries]);
}

/**
 * useContainerCallback
 * Hook that calls a callback when container size changes
 *
 * @param ref - React ref to the container element
 * @param callback - Callback function receiving width, height, and breakpoint
 */
export function useContainerCallback(
  ref: RefObject<HTMLElement | null>,
  callback: (width: number, height: number, breakpoint: ContainerBreakpoint) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const breakpoint = getContainerBreakpointFromWidth(width);
        callbackRef.current(width, height, breakpoint);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
}

/**
 * Container query utilities for responsive values
 */
export const containerQueryUtils = {
  /**
   * Get value based on container breakpoint
   */
  getValue<T>(
    breakpoint: ContainerBreakpoint,
    values: Partial<Record<ContainerBreakpoint, T>>,
    fallback: T
  ): T {
    const breakpointOrder: ContainerBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(breakpoint);

    // Check from current breakpoint down to find a value
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp]!;
      }
    }

    return fallback;
  },

  /**
   * Check if breakpoint is at least the given size
   */
  isAtLeast(current: ContainerBreakpoint, target: ContainerBreakpoint): boolean {
    const breakpointOrder: ContainerBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    return breakpointOrder.indexOf(current) >= breakpointOrder.indexOf(target);
  },

  /**
   * Check if breakpoint is at most the given size
   */
  isAtMost(current: ContainerBreakpoint, target: ContainerBreakpoint): boolean {
    const breakpointOrder: ContainerBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    return breakpointOrder.indexOf(current) <= breakpointOrder.indexOf(target);
  },
};
