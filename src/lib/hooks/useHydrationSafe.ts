"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook to safely handle hydration mismatches between server and client rendering.
 * Returns true once the component has mounted on the client, preventing hydration errors.
 *
 * @returns {boolean} mounted - True if component is mounted on client, false during SSR
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const mounted = useHydrationSafe();
 *
 *   if (!mounted) return null;
 *
 *   return <div>Client-only content</div>;
 * }
 * ```
 */
export function useHydrationSafe(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
