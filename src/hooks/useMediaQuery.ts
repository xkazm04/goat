'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook to track media query matches
 *
 * @param query - The media query string to match (e.g., "(min-width: 768px)")
 * @returns boolean indicating whether the media query matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with false to avoid hydration mismatch
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Define the event handler
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener
    // Use addEventListener for modern browsers, addListener for legacy support
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Predefined breakpoint hooks for common responsive scenarios
 */

/** Returns true when screen width is 640px or less (mobile) */
export function useIsMobile() {
  return useMediaQuery('(max-width: 640px)');
}

/** Returns true when screen width is between 641px and 768px (small tablet) */
export function useIsSmallTablet() {
  return useMediaQuery('(min-width: 641px) and (max-width: 768px)');
}

/** Returns true when screen width is between 769px and 1024px (tablet) */
export function useIsTablet() {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

/** Returns true when screen width is 1025px or more (desktop) */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1025px)');
}

/** Returns true when screen width is 768px or less (mobile + small tablet) */
export function useIsSmallScreen() {
  return useMediaQuery('(max-width: 768px)');
}

/** Returns true when screen width is 1024px or less (mobile + tablet) */
export function useIsMediumScreen() {
  return useMediaQuery('(max-width: 1024px)');
}

/** Returns true on touch devices (coarse pointer like touchscreens) */
export function useIsTouchDevice() {
  return useMediaQuery('(pointer: coarse)');
}
