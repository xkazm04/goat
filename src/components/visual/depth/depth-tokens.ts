/**
 * Depth Token System
 *
 * Centralized elevation and glow tokens for consistent visual depth.
 * All blur values capped at 20px max for drag performance.
 *
 * Usage:
 *   style={{ boxShadow: ELEVATION.medium }}
 *   style={{ boxShadow: GLOW_PRESET.goldMedium }}
 *   style={{ boxShadow: getGlow('intense', 'gold') }}
 */

// =============================================================================
// ELEVATION TOKENS
// =============================================================================

/**
 * Standard elevation shadows - single or double layer
 * Blur values: max 20px (performance constraint for draggables)
 */
export const ELEVATION = {
  none: 'none',
  low: '0 1px 2px 0 rgb(0 0 0 / 0.1)',
  medium: '0 4px 6px -1px rgb(0 0 0 / 0.15), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  high: '0 10px 15px -3px rgb(0 0 0 / 0.15), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  floating: '0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

/**
 * Layered elevation shadows (Josh Comeau technique)
 * More realistic depth through multiple stacked shadows
 * Use for static elevated surfaces (not draggables - too many layers)
 */
export const ELEVATION_LAYERED = {
  low: [
    '0 1px 1px hsl(0deg 0% 0% / 0.075)',
  ].join(', '),
  medium: [
    '0 1px 1px hsl(0deg 0% 0% / 0.075)',
    '0 2px 2px hsl(0deg 0% 0% / 0.075)',
    '0 4px 4px hsl(0deg 0% 0% / 0.075)',
  ].join(', '),
  high: [
    '0 1px 1px hsl(0deg 0% 0% / 0.06)',
    '0 2px 2px hsl(0deg 0% 0% / 0.06)',
    '0 4px 4px hsl(0deg 0% 0% / 0.06)',
    '0 8px 8px hsl(0deg 0% 0% / 0.06)',
    '0 16px 16px hsl(0deg 0% 0% / 0.06)',
  ].join(', '),
} as const;

export type ElevationLevel = keyof typeof ELEVATION;
export type ElevationLayeredLevel = keyof typeof ELEVATION_LAYERED;

// =============================================================================
// GLOW TOKENS
// =============================================================================

/**
 * Glow intensity levels
 * blur: Spread of the glow (max 20px for performance)
 * opacity: Visibility of the glow color
 */
export const GLOW_INTENSITY = {
  subtle: { blur: '10px', opacity: 0.3 },
  medium: { blur: '15px', opacity: 0.5 },
  intense: { blur: '20px', opacity: 0.7 },  // Max blur per performance constraint
} as const;

/**
 * Glow colors - RGB values for composable glow generation
 * Medal colors match existing PodiumView patterns
 */
export const GLOW_COLOR = {
  // Medal colors (from existing PodiumView.tsx patterns)
  gold: { r: 250, g: 204, b: 21 },     // yellow-400 equivalent
  silver: { r: 203, g: 213, b: 225 },  // slate-300 equivalent
  bronze: { r: 251, g: 146, b: 60 },   // orange-400 equivalent
  // Utility colors
  primary: { r: 6, g: 182, b: 212 },   // cyan-500 - matches existing app accent
  accent: { r: 147, g: 51, b: 234 },   // purple-600
} as const;

export type GlowIntensity = keyof typeof GLOW_INTENSITY;
export type GlowColor = keyof typeof GLOW_COLOR;

/**
 * Generate a glow CSS box-shadow value
 * @param intensity - subtle | medium | intense
 * @param color - gold | silver | bronze | primary | accent
 * @returns CSS box-shadow string
 */
export function getGlow(intensity: GlowIntensity, color: GlowColor): string {
  const { blur, opacity } = GLOW_INTENSITY[intensity];
  const { r, g, b } = GLOW_COLOR[color];
  return `0 0 ${blur} rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Pre-computed glow presets for common use cases
 * Avoid runtime computation - just reference the preset
 */
export const GLOW_PRESET = {
  // Gold glows (1st place, premium)
  goldSubtle: getGlow('subtle', 'gold'),
  goldMedium: getGlow('medium', 'gold'),
  goldIntense: getGlow('intense', 'gold'),
  // Silver glows (2nd place)
  silverSubtle: getGlow('subtle', 'silver'),
  silverMedium: getGlow('medium', 'silver'),
  silverIntense: getGlow('intense', 'silver'),
  // Bronze glows (3rd place)
  bronzeSubtle: getGlow('subtle', 'bronze'),
  bronzeMedium: getGlow('medium', 'bronze'),
  bronzeIntense: getGlow('intense', 'bronze'),
  // Primary glows (general highlights)
  primarySubtle: getGlow('subtle', 'primary'),
  primaryMedium: getGlow('medium', 'primary'),
  primaryIntense: getGlow('intense', 'primary'),
  // Accent glows (special emphasis)
  accentSubtle: getGlow('subtle', 'accent'),
  accentMedium: getGlow('medium', 'accent'),
  accentIntense: getGlow('intense', 'accent'),
} as const;

export type GlowPreset = keyof typeof GLOW_PRESET;

// =============================================================================
// SURFACE ELEVATION (Dark Mode)
// =============================================================================

/**
 * Surface colors for dark mode elevation
 * Higher elevation = lighter surface (Atlassian pattern)
 * Use with ELEVATION shadows for full depth effect
 */
export const SURFACE_ELEVATION = {
  sunken: 'hsl(222.2 84% 3.5%)',    // Below baseline (inset areas)
  default: 'hsl(222.2 84% 4.9%)',   // Baseline (matches --background)
  raised: 'hsl(222.2 84% 7%)',      // Cards, draggables
  overlay: 'hsl(222.2 84% 10%)',    // Modals, dropdowns
} as const;

export type SurfaceLevel = keyof typeof SURFACE_ELEVATION;

// =============================================================================
// COMBINED DEPTH PRESETS
// =============================================================================

/**
 * Combined depth presets pairing surface color + shadow
 * For quick application of consistent elevation
 */
export const DEPTH_PRESET = {
  card: {
    surface: SURFACE_ELEVATION.raised,
    shadow: ELEVATION.low,
  },
  cardHover: {
    surface: SURFACE_ELEVATION.raised,
    shadow: ELEVATION.medium,
  },
  modal: {
    surface: SURFACE_ELEVATION.overlay,
    shadow: ELEVATION.high,
  },
  drag: {
    surface: SURFACE_ELEVATION.overlay,
    shadow: ELEVATION.floating,
  },
} as const;

export type DepthPreset = keyof typeof DEPTH_PRESET;
