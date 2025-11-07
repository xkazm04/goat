"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

/**
 * StatisticBadge Variants
 * Defines visual styles for different badge appearances
 */
const statisticBadgeVariants = cva(
  "inline-flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 border",
  {
    variants: {
      variant: {
        default: "bg-gray-800/60 border-gray-700/50 hover:border-gray-600/70",
        primary: "bg-cyan-900/30 border-cyan-700/50 hover:border-cyan-600/70",
        success: "bg-green-900/30 border-green-700/50 hover:border-green-600/70",
        warning: "bg-yellow-900/30 border-yellow-700/50 hover:border-yellow-600/70",
        danger: "bg-red-900/30 border-red-700/50 hover:border-red-600/70",
        info: "bg-blue-900/30 border-blue-700/50 hover:border-blue-600/70",
      },
      size: {
        sm: "text-xs px-2 py-1 gap-1",
        md: "text-sm px-3 py-1.5 gap-2",
        lg: "text-base px-4 py-2 gap-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

/**
 * StatisticBadge Props Interface
 */
export interface StatisticBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statisticBadgeVariants> {
  /** The metric value to display */
  value: string | number;

  /** Label for the metric */
  label: string;

  /** Optional icon element */
  icon?: React.ReactNode;

  /** Custom color for the value text */
  valueColor?: string;

  /** Custom color for the label text */
  labelColor?: string;

  /** Optional tooltip content */
  tooltip?: string | React.ReactNode;

  /** Tooltip side position */
  tooltipSide?: "top" | "right" | "bottom" | "left";

  /** Enable value animation on change */
  animate?: boolean;

  /** Custom class name for the value element */
  valueClassName?: string;

  /** Custom class name for the label element */
  labelClassName?: string;

  /** Test ID for testing */
  testId?: string;

  /** Callback when badge is clicked */
  onClick?: () => void;

  /** Show badge as clickable */
  clickable?: boolean;

  /** ARIA label for accessibility */
  ariaLabel?: string;
}

/**
 * StatisticBadge Component
 *
 * A reusable badge component that displays a single metric (e.g., average ranking)
 * with an icon, label, and value. Supports tooltips, color schemes, and animated
 * value changes with Framer Motion.
 *
 * @example Basic usage
 * ```tsx
 * <StatisticBadge
 *   label="Avg Rating"
 *   value="4.5★"
 *   valueColor="text-yellow-500"
 * />
 * ```
 *
 * @example With icon and tooltip
 * ```tsx
 * <StatisticBadge
 *   label="Total Items"
 *   value={42}
 *   icon={<ListIcon />}
 *   tooltip="Total number of items in collection"
 *   variant="primary"
 * />
 * ```
 *
 * @example Animated value change
 * ```tsx
 * <StatisticBadge
 *   label="Score"
 *   value={score}
 *   animate={true}
 *   variant="success"
 * />
 * ```
 */
export const StatisticBadge = React.forwardRef<HTMLDivElement, StatisticBadgeProps>(
  (
    {
      value,
      label,
      icon,
      valueColor = "text-gray-300",
      labelColor = "text-gray-500",
      tooltip,
      tooltipSide = "top",
      animate = true,
      valueClassName,
      labelClassName,
      variant = "default",
      size = "md",
      testId,
      onClick,
      clickable = false,
      ariaLabel,
      className,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = React.useState(value);
    const isClickable = clickable || !!onClick;

    // Update display value when value prop changes
    React.useEffect(() => {
      setDisplayValue(value);
    }, [value]);

    // Badge content
    const badgeContent = (
      <div
        ref={ref}
        className={cn(
          statisticBadgeVariants({ variant, size }),
          isClickable && "cursor-pointer hover:shadow-md hover:scale-105 active:scale-95",
          className
        )}
        onClick={onClick}
        role={isClickable ? "button" : undefined}
        aria-label={ariaLabel || `${label}: ${value}`}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        data-testid={testId || `statistic-badge-${label.toLowerCase().replace(/\s+/g, "-")}`}
        {...props}
      >
        {/* Icon */}
        {icon && (
          <span className="text-gray-400 flex-shrink-0" data-testid="statistic-badge-icon">
            {icon}
          </span>
        )}

        {/* Label */}
        <span
          className={cn("font-medium", labelColor, labelClassName)}
          data-testid="statistic-badge-label"
        >
          {label}:
        </span>

        {/* Value with animation */}
        <AnimatePresence mode="wait">
          {animate ? (
            <motion.span
              key={String(displayValue)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className={cn("font-semibold", valueColor, valueClassName)}
              data-testid="statistic-badge-value"
            >
              {displayValue}
            </motion.span>
          ) : (
            <span
              className={cn("font-semibold", valueColor, valueClassName)}
              data-testid="statistic-badge-value"
            >
              {displayValue}
            </span>
          )}
        </AnimatePresence>
      </div>
    );

    // Wrap with tooltip if provided
    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              {typeof tooltip === "string" ? <p>{tooltip}</p> : tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badgeContent;
  }
);

StatisticBadge.displayName = "StatisticBadge";

export { statisticBadgeVariants };
