"use client";

import { ReactNode, memo, createContext, useContext, useMemo } from "react";
import {
  NeonArenaBackground,
  NeonArenaBackgroundProps,
  FloatingOrbConfig,
  DEFAULT_ORBS,
  SECTION_ORBS,
  MINIMAL_ORBS,
} from "./NeonArenaBackground";

// Theme variants for common use cases
export type NeonArenaVariant = "fullPage" | "section" | "minimal" | "showcase" | "custom";

export interface NeonArenaThemeConfig {
  /** Theme variant - determines preset configuration */
  variant: NeonArenaVariant;
  /** Custom orbs configuration (for 'custom' variant or to override preset) */
  orbs?: FloatingOrbConfig[];
  /** Override center glow visibility */
  showCenterGlow?: boolean;
  /** Override glow intensity (0-1) */
  glowIntensity?: number;
  /** Override grid visibility */
  showGrid?: boolean;
  /** Override mesh visibility */
  showMesh?: boolean;
  /** Override line accents visibility */
  showLineAccents?: boolean;
  /** Override grid opacity (0-1) */
  gridOpacity?: number;
  /** Override grid size in pixels */
  gridSize?: number;
}

export interface NeonArenaThemeProps {
  /** Theme configuration */
  config?: Partial<NeonArenaThemeConfig>;
  /** Quick variant selection (alternative to config.variant) */
  variant?: NeonArenaVariant;
  /** Content to render inside the themed container */
  children: ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Container element tag - defaults to 'div' */
  as?: "div" | "section" | "main" | "article";
  /** data-testid for testing */
  "data-testid"?: string;
}

// Preset configurations for each variant
const VARIANT_PRESETS: Record<NeonArenaVariant, Omit<NeonArenaBackgroundProps, "asSection">> = {
  fullPage: {
    showCenterGlow: true,
    glowIntensity: 0.15,
    showGrid: true,
    showMesh: true,
    showLineAccents: true,
    orbs: DEFAULT_ORBS,
    gridOpacity: 0.03,
    gridSize: 60,
  },
  section: {
    showCenterGlow: true,
    glowIntensity: 0.1,
    showGrid: true,
    showMesh: false,
    showLineAccents: false,
    orbs: SECTION_ORBS,
    gridOpacity: 0.03,
    gridSize: 60,
  },
  minimal: {
    showCenterGlow: true,
    glowIntensity: 0.08,
    showGrid: false,
    showMesh: false,
    showLineAccents: false,
    orbs: MINIMAL_ORBS,
    gridOpacity: 0.02,
    gridSize: 60,
  },
  showcase: {
    showCenterGlow: true,
    glowIntensity: 0.12,
    showGrid: true,
    showMesh: false,
    showLineAccents: false,
    orbs: [
      {
        position: { x: 25, y: 25 },
        size: 384,
        opacity: 0.12,
        blur: 48,
        duration: 15,
        movement: { x: 50, y: -30 },
        scale: [1, 1.1],
      },
      {
        position: { x: 75, y: 67 },
        size: 320,
        opacity: 0.1,
        blur: 48,
        duration: 18,
        movement: { x: -40, y: 40 },
        scale: [1, 1.15],
        secondary: true,
      },
    ],
    gridOpacity: 0.03,
    gridSize: 60,
  },
  custom: {
    showCenterGlow: true,
    glowIntensity: 0.1,
    showGrid: true,
    showMesh: false,
    showLineAccents: false,
    orbs: [],
    gridOpacity: 0.03,
    gridSize: 60,
  },
};

// Context for nested components to access theme configuration
interface NeonArenaContextValue {
  variant: NeonArenaVariant;
  config: NeonArenaBackgroundProps;
}

const NeonArenaContext = createContext<NeonArenaContextValue | null>(null);

/**
 * Hook to access the NeonArena theme context
 * Useful for nested components that need to know the current theme variant
 */
export function useNeonArenaTheme() {
  const context = useContext(NeonArenaContext);
  if (!context) {
    throw new Error("useNeonArenaTheme must be used within a NeonArenaTheme provider");
  }
  return context;
}

/**
 * Optional hook that returns null if not inside a theme provider
 * Useful for components that can work both inside and outside the theme
 */
export function useOptionalNeonArenaTheme() {
  return useContext(NeonArenaContext);
}

/**
 * NeonArenaTheme - Unified theme layer component for the Landing module
 *
 * Provides a consistent visual shell with slots for content, automatically
 * applying the Neon Arena visual style (dark background, cyan orbs, grid pattern).
 *
 * @example
 * // Full page layout
 * <NeonArenaTheme variant="fullPage">
 *   <YourContent />
 * </NeonArenaTheme>
 *
 * @example
 * // Section within a page
 * <NeonArenaTheme variant="section" as="section" className="py-20">
 *   <YourSectionContent />
 * </NeonArenaTheme>
 *
 * @example
 * // Custom configuration
 * <NeonArenaTheme
 *   config={{
 *     variant: "custom",
 *     showCenterGlow: true,
 *     glowIntensity: 0.2,
 *     orbs: customOrbs,
 *   }}
 * >
 *   <CustomContent />
 * </NeonArenaTheme>
 */
export const NeonArenaTheme = memo(function NeonArenaTheme({
  config,
  variant: propVariant,
  children,
  className = "",
  as: Container = "div",
  "data-testid": testId,
}: NeonArenaThemeProps) {
  // Determine the variant to use
  const variant = config?.variant ?? propVariant ?? "fullPage";
  const preset = VARIANT_PRESETS[variant];

  // Merge preset with any overrides from config
  const backgroundProps: NeonArenaBackgroundProps = useMemo(() => ({
    asSection: variant === "section" || variant === "minimal",
    showCenterGlow: config?.showCenterGlow ?? preset.showCenterGlow,
    glowIntensity: config?.glowIntensity ?? preset.glowIntensity,
    showGrid: config?.showGrid ?? preset.showGrid,
    gridOpacity: config?.gridOpacity ?? preset.gridOpacity,
    gridSize: config?.gridSize ?? preset.gridSize,
    showMesh: config?.showMesh ?? preset.showMesh,
    showLineAccents: config?.showLineAccents ?? preset.showLineAccents,
    orbs: config?.orbs ?? preset.orbs,
  }), [config, preset, variant]);

  // Context value for nested components
  const contextValue = useMemo<NeonArenaContextValue>(() => ({
    variant,
    config: backgroundProps,
  }), [variant, backgroundProps]);

  // Container styles based on variant
  const containerClassName = useMemo(() => {
    const baseStyles = "relative overflow-hidden";
    const variantStyles = variant === "fullPage"
      ? "min-h-screen w-full"
      : "";
    return `${baseStyles} ${variantStyles} ${className}`.trim();
  }, [variant, className]);

  return (
    <NeonArenaContext.Provider value={contextValue}>
      <Container
        className={containerClassName}
        data-testid={testId}
        data-neon-arena-variant={variant}
      >
        {/* Background layer */}
        <NeonArenaBackground
          {...backgroundProps}
          data-testid={testId ? `${testId}-background` : undefined}
        />

        {/* Content slot - positioned above background */}
        <div className="relative z-10">
          {children}
        </div>
      </Container>
    </NeonArenaContext.Provider>
  );
});

// Re-export orb configurations for convenience
export { DEFAULT_ORBS, SECTION_ORBS, MINIMAL_ORBS } from "./NeonArenaBackground";
export type { FloatingOrbConfig } from "./NeonArenaBackground";
