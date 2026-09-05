"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

import type { ThemeProviderProps } from "next-themes";


/**
 * Thin wrapper around the next-themes ThemeProvider.
 *
 * Note: the `experimental-dark` → `dark` fallback for unsupported browsers is
 * handled entirely in CSS via the `@supports not(...)` block in globals.css —
 * this provider does NOT run any JS detection. (`src/lib/theme-support.ts`
 * exports JS helpers for this but they are currently unused; don't assume a
 * runtime JS guard exists here.)
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  );
}
