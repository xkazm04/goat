"use client";

import { ComponentType } from "react";
import { useHydrationSafe } from "@/lib/hooks/useHydrationSafe";

/**
 * Higher-order component that wraps a component to handle hydration safety.
 * The wrapped component will only render after the client has mounted,
 * preventing hydration mismatches between server and client.
 *
 * @template P - The props type of the wrapped component
 * @param {ComponentType<P>} Component - The component to wrap
 * @param {React.ReactNode} [fallback=null] - Optional fallback to show during SSR/hydration
 * @returns {ComponentType<P>} A new component that renders safely after hydration
 *
 * @example
 * ```tsx
 * const SafeThemeToggle = withHydrationSafe(ThemeToggle);
 *
 * // With a custom fallback
 * const SafeUserMenu = withHydrationSafe(UserMenu, <LoadingSpinner />);
 * ```
 */
export function withHydrationSafe<P extends object>(
  Component: ComponentType<P>,
  fallback: React.ReactNode = null
): ComponentType<P> {
  const HydrationSafeComponent = (props: P) => {
    const mounted = useHydrationSafe();

    if (!mounted) {
      return <>{fallback}</>;
    }

    return <Component {...props} />;
  };

  // Preserve component name for debugging
  HydrationSafeComponent.displayName = `withHydrationSafe(${
    Component.displayName || Component.name || "Component"
  })`;

  return HydrationSafeComponent;
}
