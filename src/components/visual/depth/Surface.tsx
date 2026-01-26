"use client";

import { forwardRef, type HTMLAttributes, type CSSProperties } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { SURFACE_ELEVATION, type SurfaceLevel } from "./depth-tokens";
import { cn } from "@/lib/utils";

/**
 * Surface variant styles using class-variance-authority
 *
 * - solid: Opaque surface with SURFACE_ELEVATION background
 * - glass: Translucent surface with Safari-safe backdrop-blur
 * - outline: Transparent with border only
 */
const surfaceVariants = cva(
  // Base classes applied to all variants
  "relative rounded-lg overflow-hidden",
  {
    variants: {
      variant: {
        // Solid: Uses SURFACE_ELEVATION via style prop for background
        solid: "border border-border",
        // Glass: Safari-safe blur with fallback solid background
        // Note: -webkit-backdrop-filter uses fixed value, NOT CSS variable (Safari bug)
        glass: [
          "bg-slate-900/80",
          "border border-white/10",
          "backdrop-blur-[12px]",
          "[-webkit-backdrop-filter:blur(12px)]",
        ].join(" "),
        // Outline: Transparent with border
        outline: "bg-transparent border border-border",
      },
    },
    defaultVariants: {
      variant: "solid",
    },
  }
);

/**
 * Props for the Surface component
 */
export interface SurfaceProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {
  /** Surface variant: solid (default), glass, or outline */
  variant?: "solid" | "glass" | "outline";
  /** Elevation level for solid variant background color */
  elevation?: SurfaceLevel;
  /** Additional inline styles */
  style?: CSSProperties;
}

/**
 * Surface - Background component with solid/glass/outline variants
 *
 * Provides consistent surface styling with Safari-safe backdrop-blur
 * fallback for glass variant and SURFACE_ELEVATION colors for solid.
 *
 * @example
 * ```tsx
 * // Solid surface (default)
 * <Surface elevation="raised">
 *   <Card content />
 * </Surface>
 *
 * // Glass surface with blur
 * <Surface variant="glass">
 *   <Modal content />
 * </Surface>
 *
 * // Outline only
 * <Surface variant="outline">
 *   <Section content />
 * </Surface>
 * ```
 */
export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  (
    {
      variant = "solid",
      elevation = "default",
      children,
      className,
      style,
      ...rest
    },
    ref
  ) => {
    // Only apply SURFACE_ELEVATION background for solid variant
    const backgroundStyle: CSSProperties =
      variant === "solid"
        ? { backgroundColor: SURFACE_ELEVATION[elevation] }
        : {};

    return (
      <div
        ref={ref}
        className={cn(surfaceVariants({ variant }), className)}
        style={{
          ...backgroundStyle,
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Surface.displayName = "Surface";
