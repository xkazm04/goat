"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  checkExperimentalDarkSupport,
  getSafeTheme,
  type ThemeSupportResult,
} from "@/lib/theme-support";

export interface UseThemeFallbackResult {
  /**
   * The actual theme being applied (may differ from requested theme due to fallback)
   */
  effectiveTheme: string | undefined;
  /**
   * The theme the user requested
   */
  requestedTheme: string | undefined;
  /**
   * Whether a fallback is currently active
   */
  isFallbackActive: boolean;
  /**
   * Support details for experimental-dark theme
   */
  support: ThemeSupportResult | null;
  /**
   * Whether the check is still loading
   */
  isLoading: boolean;
}

/**
 * Custom hook that manages theme fallback logic for experimental-dark theme.
 *
 * This hook:
 * - Detects CSS feature support on mount
 * - Automatically falls back to 'dark' theme if experimental-dark is not supported
 * - Provides information about which features are missing
 * - Shows warning to user when fallback occurs
 *
 * @returns UseThemeFallbackResult object with theme state and support info
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { effectiveTheme, isFallbackActive, support } = useThemeFallback();
 *
 *   if (isFallbackActive) {
 *     console.log('Using fallback theme due to missing features:', support?.features);
 *   }
 *
 *   return <div className={effectiveTheme}>...</div>;
 * }
 * ```
 */
export function useThemeFallback(): UseThemeFallbackResult {
  const { theme: requestedTheme, setTheme } = useTheme();
  const [support, setSupport] = useState<ThemeSupportResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check support on mount (client-side only)
    const checkSupport = () => {
      const supportResult = checkExperimentalDarkSupport();
      setSupport(supportResult);
      setIsLoading(false);

      // If user selected experimental-dark but it's not supported, fallback
      if (requestedTheme === "experimental-dark" && !supportResult.isSupported) {
        const fallbackTheme = supportResult.fallbackTheme;
        console.warn(
          `[useThemeFallback] Experimental dark theme not supported. Falling back to '${fallbackTheme}'.`
        );
        setTheme(fallbackTheme);
      }
    };

    checkSupport();
  }, [requestedTheme, setTheme]);

  // Determine effective theme
  const effectiveTheme =
    requestedTheme === "experimental-dark" && support && !support.isSupported
      ? support.fallbackTheme
      : requestedTheme;

  const isFallbackActive =
    requestedTheme === "experimental-dark" &&
    effectiveTheme !== "experimental-dark";

  return {
    effectiveTheme,
    requestedTheme,
    isFallbackActive,
    support,
    isLoading,
  };
}
