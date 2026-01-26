"use client";

import { forwardRef, type HTMLAttributes, type CSSProperties } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { ELEVATION, type ElevationLevel } from "./depth-tokens";
import { useMotionCapabilities } from "@/hooks/use-motion-preference";
import { cn } from "@/lib/utils";

/**
 * Props for the Elevated component
 */
export interface ElevatedProps
  extends Omit<HTMLMotionProps<"div">, "ref" | "style"> {
  /** Elevation level - determines shadow depth */
  level?: ElevationLevel;
  /** Whether to lift on hover (default: true) */
  hoverLift?: boolean;
  /** Amount to lift on hover in pixels (default: -4) */
  liftAmount?: number;
  /** Additional inline styles */
  style?: CSSProperties;
}

/**
 * Elevated - Wrapper component with elevation shadow and hover lift
 *
 * Applies box-shadow from ELEVATION tokens and optionally lifts on hover
 * when motion preferences allow interaction animations.
 *
 * @example
 * ```tsx
 * <Elevated level="medium" hoverLift>
 *   <Card>Content with depth</Card>
 * </Elevated>
 *
 * <Elevated level="high" hoverLift={false}>
 *   Static elevated surface
 * </Elevated>
 * ```
 */
export const Elevated = forwardRef<HTMLDivElement, ElevatedProps>(
  (
    {
      level = "medium",
      hoverLift = true,
      liftAmount = -4,
      children,
      className,
      style,
      ...rest
    },
    ref
  ) => {
    const { allowInteraction } = useMotionCapabilities();
    const shouldAnimate = hoverLift && allowInteraction;

    // Standard easing curve for smooth transitions
    const easing: [number, number, number, number] = [0.4, 0, 0.2, 1];

    return (
      <motion.div
        ref={ref}
        className={cn(className)}
        style={{
          boxShadow: ELEVATION[level],
          ...style,
        }}
        whileHover={
          shouldAnimate
            ? {
                y: liftAmount,
                boxShadow: ELEVATION.floating,
              }
            : undefined
        }
        transition={{
          duration: 0.2,
          ease: easing,
        }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);

Elevated.displayName = "Elevated";
