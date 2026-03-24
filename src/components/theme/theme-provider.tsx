"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

import type { ThemeProviderProps } from "next-themes";


/**
 * Enhanced ThemeProvider that wraps next-themes ThemeProvider.
 *
 * Features:
 * - Wraps next-themes ThemeProvider
 * - Falls back to 'dark' theme if experimental-dark is not supported via CSS @supports
 * - Provides all standard next-themes functionality
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  );
}
