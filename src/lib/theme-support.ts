/**
 * Theme Support Detection Utility
 *
 * Provides runtime detection of CSS feature support for the experimental-dark theme.
 * Uses CSS.supports() API to check if the browser supports required features.
 */

export interface ThemeSupportResult {
  /**
   * Whether the browser supports all required CSS features for experimental-dark theme
   */
  isSupported: boolean;
  /**
   * Details about which specific features are supported
   */
  features: {
    oklch: boolean;
    backdropFilter: boolean;
  };
  /**
   * Recommended fallback theme if experimental-dark is not supported
   */
  fallbackTheme: 'dark' | 'light';
}

/**
 * Checks if the browser supports advanced CSS features required for experimental-dark theme
 *
 * Required features:
 * - OKLCH color space for vibrant neon colors
 * - backdrop-filter for glassmorphism effects
 *
 * @returns ThemeSupportResult object with support details
 */
export function checkExperimentalDarkSupport(): ThemeSupportResult {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || !window.CSS || !window.CSS.supports) {
    return {
      isSupported: false,
      features: {
        oklch: false,
        backdropFilter: false,
      },
      fallbackTheme: 'dark',
    };
  }

  // Check OKLCH color space support
  const oklchSupported = CSS.supports('color', 'oklch(0.5 0.2 180)');

  // Check backdrop-filter support
  const backdropFilterSupported =
    CSS.supports('backdrop-filter', 'blur(10px)') ||
    CSS.supports('-webkit-backdrop-filter', 'blur(10px)');

  const isSupported = oklchSupported && backdropFilterSupported;

  return {
    isSupported,
    features: {
      oklch: oklchSupported,
      backdropFilter: backdropFilterSupported,
    },
    fallbackTheme: 'dark',
  };
}

/**
 * Gets a safe theme value that falls back to 'dark' if experimental-dark is not supported
 *
 * @param requestedTheme - The theme the user wants to use
 * @returns The theme to actually apply (may be fallback)
 */
export function getSafeTheme(requestedTheme: string): string {
  if (requestedTheme !== 'experimental-dark') {
    return requestedTheme;
  }

  const support = checkExperimentalDarkSupport();

  if (!support.isSupported) {
    console.warn(
      '[Theme] Experimental dark theme not fully supported. Missing features:',
      Object.entries(support.features)
        .filter(([_, supported]) => !supported)
        .map(([feature]) => feature)
        .join(', '),
      `Falling back to ${support.fallbackTheme} theme.`
    );
    return support.fallbackTheme;
  }

  return requestedTheme;
}

/**
 * Checks if experimental-dark theme is available in the current browser
 *
 * @returns true if all required CSS features are supported
 */
export function isExperimentalDarkAvailable(): boolean {
  return checkExperimentalDarkSupport().isSupported;
}
