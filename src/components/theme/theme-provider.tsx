"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { checkExperimentalDarkSupport } from "@/lib/theme-support";

/**
 * Enhanced ThemeProvider that includes fallback support for experimental-dark theme.
 *
 * Features:
 * - Wraps next-themes ThemeProvider
 * - Automatically detects CSS feature support
 * - Falls back to 'dark' theme if experimental-dark is not supported
 * - Provides all standard next-themes functionality
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  // Check CSS support on mount and log results
  React.useEffect(() => {
    setMounted(true);

    const support = checkExperimentalDarkSupport();

    if (!support.isSupported) {
      console.info(
        "[ThemeProvider] Experimental dark theme features not fully supported in this browser.",
        "\nMissing features:",
        Object.entries(support.features)
          .filter(([_, supported]) => !supported)
          .map(([feature]) => feature)
          .join(", "),
        "\nFallback mechanism active: CSS @supports rules will apply standard dark theme styles."
      );
    } else {
      console.info(
        "[ThemeProvider] All experimental dark theme features supported. Full theme experience available."
      );
    }
  }, []);

  // Pass through to next-themes provider
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  );
}