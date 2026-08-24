"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type CSSProperties } from "react";

import { useMotionCapabilities } from "@/hooks/use-motion-preference";
import { DURATION, EASE } from '@/lib/animations/motion-presets';
import { cn } from "@/lib/utils";

import { ELEVATION, type ElevationLevel } from "./depth-tokens";

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
          duration: DURATION.quick,
          ease: EASE.inOut,
        }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);

Elevated.displayName = "Elevated";
