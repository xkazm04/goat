"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

/**
 * StatsCard Variants
 * Defines visual styles for different stat card layouts
 */
const statsCardVariants = cva(
  "flex items-center transition-all",
  {
    variants: {
      layout: {
        inline: "gap-4 text-xs flex-wrap",
        stacked: "flex-col gap-2 p-4 bg-gray-800/40 border border-gray-700/50 rounded-lg",
        grid: "grid gap-4",
        spread: "justify-between w-full",
      },
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      layout: "inline",
      size: "sm",
    },
  }
);

/**
 * Individual Stat Item Variants
 */
const statItemVariants = cva(
  "flex items-center transition-colors",
  {
    variants: {
      layout: {
        inline: "gap-1",
        stacked: "flex-col items-start gap-0.5",
        grid: "flex-col items-center text-center p-3 bg-gray-800/60 border border-gray-700/50 rounded-md hover:border-gray-600/70",
        spread: "gap-2",
      },
      emphasis: {
        default: "",
        primary: "font-semibold",
        secondary: "opacity-75",
      },
    },
    defaultVariants: {
      layout: "inline",
      emphasis: "default",
    },
  }
);

/**
 * Metric Interface
 * Defines the shape of a single metric object
 */
export interface Metric {
  /** Unique identifier for the metric */
  id?: string;

  /** Label/name of the metric */
  label: string;

  /** The actual metric value (can be string or number) */
  value: string | number;

  /** Optional icon to display (as React element) */
  icon?: React.ReactNode;

  /** Optional custom color for the value */
  color?: string;

  /** Optional subtitle or description */
  subtitle?: string;

  /** Emphasis level */
  emphasis?: "default" | "primary" | "secondary";

  /** Optional change indicator (e.g., "+5%", "-2") */
  change?: string;

  /** Whether the change is positive (green) or negative (red) */
  changeType?: "positive" | "negative" | "neutral";
}

/**
 * StatsCard Props Interface
 */
export interface StatsCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statsCardVariants> {
  /** Array of metrics to display */
  metrics: Metric[];

  /** Loading state - shows skeleton */
  loading?: boolean;

  /** Number of skeleton items to show when loading */
  skeletonCount?: number;

  /** Custom class name for the container */
  className?: string;

  /** Custom class name for individual stat items */
  itemClassName?: string;

  /** Grid columns (only applies to grid layout) */
  gridCols?: 2 | 3 | 4 | 5 | 6;

  /** Enable dark mode styling (default: true) */
  darkMode?: boolean;

  /** Test ID for testing */
  testId?: string;

  /** Callback when a metric is clicked */
  onMetricClick?: (metric: Metric) => void;

  /** Show dividers between metrics (inline layout only) */
  showDividers?: boolean;
}

/**
 * StatsCard Loading Skeleton
 */
export function StatsCardSkeleton({
  layout = "inline",
  count = 3,
  className,
}: {
  layout?: "inline" | "stacked" | "grid" | "spread";
  count?: number;
  className?: string;
}) {
  if (layout === "stacked") {
    return (
      <div className={cn("flex flex-col gap-2 p-4 bg-gray-800/40 border border-gray-700/50 rounded-lg", className)}>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <div className={cn("grid gap-4 grid-cols-2 md:grid-cols-3", className)}>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 p-3 bg-gray-800/60 border border-gray-700/50 rounded-md">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

/**
 * Individual Stat Item Component
 */
const StatItem = React.forwardRef<
  HTMLDivElement,
  {
    metric: Metric;
    layout?: "inline" | "stacked" | "grid" | "spread";
    className?: string;
    onClick?: (metric: Metric) => void;
  }
>(({ metric, layout = "inline", className, onClick }, ref) => {
  const handleClick = onClick ? () => onClick(metric) : undefined;
  const isClickable = !!onClick;

  // Default color mappings
  const defaultColors: Record<string, string> = {
    total: "text-gray-300",
    selected: "text-cyan-400",
    active: "text-green-400",
    pending: "text-yellow-400",
    completed: "text-blue-400",
    error: "text-red-400",
    warning: "text-orange-400",
  };

  const valueColor = metric.color || defaultColors[metric.label.toLowerCase()] || "text-gray-300";

  // Change indicator styling
  const changeColorClass = metric.changeType === "positive"
    ? "text-green-400"
    : metric.changeType === "negative"
    ? "text-red-400"
    : "text-gray-400";

  return (
    <div
      ref={ref}
      className={cn(
        statItemVariants({ layout, emphasis: metric.emphasis }),
        isClickable && "cursor-pointer hover:opacity-80",
        className
      )}
      onClick={handleClick}
      data-testid={`stat-item-${metric.id || metric.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Icon */}
      {metric.icon && (
        <span className="text-gray-400" data-testid="stat-item-icon">
          {metric.icon}
        </span>
      )}

      {/* Label */}
      <span
        className={cn(
          "text-gray-500",
          layout === "grid" && "text-xs"
        )}
        data-testid="stat-item-label"
      >
        {metric.label}:
      </span>

      {/* Value */}
      <span
        className={cn(
          "font-semibold",
          valueColor,
          layout === "grid" && "text-lg"
        )}
        data-testid="stat-item-value"
      >
        {metric.value}
      </span>

      {/* Change indicator */}
      {metric.change && (
        <span
          className={cn("text-xs ml-1", changeColorClass)}
          data-testid="stat-item-change"
        >
          {metric.change}
        </span>
      )}

      {/* Subtitle (only visible in stacked/grid layouts) */}
      {metric.subtitle && (layout === "stacked" || layout === "grid") && (
        <span
          className="text-xs text-gray-600 mt-0.5"
          data-testid="stat-item-subtitle"
        >
          {metric.subtitle}
        </span>
      )}
    </div>
  );
});

StatItem.displayName = "StatItem";

/**
 * Reusable StatsCard Component
 *
 * A flexible, composable stats display component that accepts an array of metric objects
 * and renders them in various layouts (inline, stacked, grid, spread). Supports dark mode,
 * loading skeletons, icons, and custom styling.
 *
 * @example
 * ```tsx
 * <StatsCard
 *   metrics={[
 *     { label: "Total", value: 100, color: "text-gray-300" },
 *     { label: "Active", value: 42, color: "text-cyan-400" },
 *     { label: "Completed", value: 58, color: "text-green-400" }
 *   ]}
 *   layout="inline"
 * />
 * ```
 *
 * @example Grid layout with icons
 * ```tsx
 * <StatsCard
 *   metrics={[
 *     { label: "Users", value: "1.2K", icon: <UserIcon />, subtitle: "+10% this week" },
 *     { label: "Revenue", value: "$45K", icon: <DollarIcon />, change: "+12%", changeType: "positive" },
 *   ]}
 *   layout="grid"
 *   gridCols={3}
 * />
 * ```
 */
export const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  (
    {
      metrics,
      loading = false,
      skeletonCount = 3,
      layout = "inline",
      size = "sm",
      className,
      itemClassName,
      gridCols = 3,
      darkMode = true,
      testId,
      onMetricClick,
      showDividers = false,
      ...props
    },
    ref
  ) => {
    // Show loading skeleton
    if (loading) {
      return (
        <StatsCardSkeleton
          layout={layout || "inline"}
          count={skeletonCount}
          className={className}
        />
      );
    }

    // Grid column classes
    const gridColsClass = layout === "grid" ? {
      2: "grid-cols-2",
      3: "grid-cols-2 md:grid-cols-3",
      4: "grid-cols-2 md:grid-cols-4",
      5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
      6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
    }[gridCols] : "";

    return (
      <div
        ref={ref}
        className={cn(
          statsCardVariants({ layout, size }),
          layout === "grid" && gridColsClass,
          darkMode && "dark",
          className
        )}
        data-testid={testId || "stats-card"}
        {...props}
      >
        {metrics.map((metric, index) => (
          <React.Fragment key={metric.id || `${metric.label}-${index}`}>
            <StatItem
              metric={metric}
              layout={layout || "inline"}
              className={itemClassName}
              onClick={onMetricClick}
            />
            {/* Dividers for inline layout */}
            {showDividers && layout === "inline" && index < metrics.length - 1 && (
              <div className="h-3 w-px bg-gray-700" data-testid="stat-divider" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);

StatsCard.displayName = "StatsCard";

export { statsCardVariants, statItemVariants };
