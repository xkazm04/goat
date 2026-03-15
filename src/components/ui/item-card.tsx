"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { ProgressiveImage } from "./progressive-image";
import { PlaceholderImage } from "./placeholder-image";

/**
 * ItemCard Variants
 * Defines visual styles for different card layouts and states
 */
const itemCardVariants = cva(
  "relative rounded-lg overflow-hidden transition-all",
  {
    variants: {
      variant: {
        default: "bg-[var(--surface-card)] border border-[var(--border-card)] hover:border-brand hover:shadow-lg hover:shadow-brand/20",
        ghost: "bg-transparent hover:bg-[var(--surface-overlay)]",
        solid: "bg-[var(--surface-deep)] border-2 border-[var(--surface-card)] hover:border-brand-hover",
      },
      layout: {
        grid: "aspect-4/5",
        list: "flex items-center gap-3 p-2",
        compact: "aspect-video",
      },
      interactive: {
        default: "cursor-pointer",
        draggable: "cursor-grab active:cursor-grabbing",
        static: "cursor-default",
      },
      state: {
        default: "opacity-100",
        dragging: "opacity-50 scale-95 z-50",
        disabled: "opacity-60 cursor-not-allowed",
        loading: "animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
      layout: "grid",
      interactive: "default",
      state: "default",
    },
  }
);

/**
 * ItemCard Props Interface
 */
export interface ItemCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof itemCardVariants> {
  /** Main title text */
  title: string;

  /** Optional subtitle or description */
  subtitle?: string;

  /** Image URL for the card */
  image?: string | null;

  /** Alt text for the image (defaults to title) */
  imageAlt?: string;

  /** Loading state - shows skeleton */
  loading?: boolean;

  /** Custom actions/buttons to render in the card */
  actions?: React.ReactNode;

  /** Position for action buttons */
  actionsPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "overlay";

  /** Enable Framer Motion animations */
  animated?: boolean;

  /** Animation delay (for staggered lists) */
  animationDelay?: number;

  /** Custom image component (for Next.js Image, etc.) */
  imageComponent?: React.ReactNode;

  /** Show overlay gradient on image */
  showOverlay?: boolean;

  /** Custom overlay content */
  overlayContent?: React.ReactNode;

  /** ARIA label for accessibility */
  ariaLabel?: string;

  /** ARIA description for accessibility */
  ariaDescription?: string;

  /** ARIA role */
  role?: string;

  /** Tabindex for keyboard navigation */
  tabIndex?: number;

  /** Test ID for testing */
  testId?: string;

  /** Hover effect intensity */
  hoverEffect?: "none" | "subtle" | "strong";

  /** Focus ring style */
  focusRing?: boolean;

  /** Enable progressive image loading */
  progressive?: boolean;

  /** Low-res placeholder for progressive loading */
  imagePlaceholder?: string;

  /** Callback when image fails to load */
  onImageError?: () => void;

  /** Callback when image loads successfully */
  onImageLoad?: () => void;

  /** Enable Letterboxd-style card flip to reveal back content */
  enableFlip?: boolean;

  /** Content to show on the back face of the card flip */
  flipContent?: React.ReactNode;

  /** Optional score content to display (criteria score display) */
  scoreContent?: React.ReactNode;

  /** Position for score display */
  scorePosition?: "bottom" | "top-right";
}

/**
 * ItemCard Loading Skeleton
 */
export function ItemCardSkeleton({
  layout = "grid",
  className,
}: {
  layout?: "grid" | "list" | "compact";
  className?: string;
}) {
  if (layout === "list") {
    return (
      <div className={cn("flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-card-subtle)]", className)}>
        <Skeleton className="w-12 h-12 rounded shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg overflow-hidden bg-[var(--surface-card)] border border-[var(--border-card)]",
      layout === "grid" ? "aspect-4/5" : "aspect-video",
      className
    )}>
      <Skeleton className="w-full h-full" />
    </div>
  );
}

/**
 * Reusable ItemCard Component
 *
 * A flexible card component for displaying items with image, title, subtitle,
 * and actions. Supports multiple layouts (grid, list, compact), loading states,
 * animations, and full accessibility.
 *
 * @example
 * ```tsx
 * <ItemCard
 *   title="Example Item"
 *   subtitle="Description"
 *   image="/image.jpg"
 *   layout="grid"
 *   animated
 * />
 * ```
 */
export const ItemCard = React.forwardRef<HTMLDivElement, ItemCardProps>(
  (
    {
      title,
      subtitle,
      image,
      imageAlt,
      loading = false,
      actions,
      actionsPosition = "top-right",
      animated = false,
      animationDelay = 0,
      imageComponent,
      showOverlay = true,
      overlayContent,
      ariaLabel,
      ariaDescription,
      role = "article",
      tabIndex = 0,
      testId,
      hoverEffect = "subtle",
      focusRing = true,
      progressive = false,
      imagePlaceholder,
      onImageError,
      onImageLoad,
      enableFlip = false,
      flipContent,
      scoreContent,
      scorePosition,
      variant,
      layout = "grid",
      interactive = "default",
      state,
      className,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const [isFlipped, setIsFlipped] = React.useState(false);

    // Handle keyboard interaction (Enter/Space)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (enableFlip && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
        return;
      }
      if (enableFlip && e.key === "Escape" && isFlipped) {
        e.preventDefault();
        setIsFlipped(false);
        return;
      }
      if (onClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
      onKeyDown?.(e);
    };

    const handleFlipClick = enableFlip
      ? (e: React.MouseEvent<HTMLDivElement>) => {
          setIsFlipped((prev) => !prev);
        }
      : onClick;

    // Show loading skeleton
    if (loading) {
      return <ItemCardSkeleton layout={layout || "grid"} className={className} />;
    }

    // Actions positioning classes
    const actionsPositionClasses = {
      "top-right": "absolute top-2 right-2",
      "top-left": "absolute top-2 left-2",
      "bottom-right": "absolute bottom-2 right-2",
      "bottom-left": "absolute bottom-2 left-2",
      "overlay": "absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity",
    };

    // Hover effect classes
    const hoverEffectClasses = {
      none: "",
      subtle: "hover:scale-[1.02]",
      strong: "hover:scale-105 hover:shadow-2xl",
    };

    // Common className
    const cardClassName = cn(
      itemCardVariants({ variant, layout, interactive, state }),
      focusRing && "focus-ring",
      hoverEffectClasses[hoverEffect],
      className
    );

    // Card content shared between animated and non-animated
    const cardContent = (
      <>
        {/* List Layout */}
        {layout === "list" && (
          <>
            {/* Image thumbnail */}
            {imageComponent || (progressive ? (
              <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-gray-900">
                <ProgressiveImage
                  src={image}
                  placeholder={imagePlaceholder}
                  alt={imageAlt || title}
                  onError={onImageError}
                  onLoad={onImageLoad}
                  testId={`${testId}-image`}
                  ariaDescription={`Image of ${title}`}
                  autoFetchWiki={true}
                  itemTitle={title}
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded overflow-hidden shrink-0">
                <PlaceholderImage
                  src={image}
                  placeholder={imagePlaceholder}
                  alt={imageAlt || title}
                  onError={onImageError}
                  onLoad={onImageLoad}
                  testId={`${testId}-list-image`}
                  seed={title}
                />
              </div>
            ))}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading text-white truncate">
                {title}
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Actions */}
            {actions && (
              <div className="shrink-0">
                {actions}
              </div>
            )}
          </>
        )}

        {/* Grid/Compact Layout */}
        {(layout === "grid" || layout === "compact") && (
          <>
            {/* Image */}
            {imageComponent || (progressive ? (
              <ProgressiveImage
                src={image}
                placeholder={imagePlaceholder}
                alt={imageAlt || title}
                onError={onImageError}
                onLoad={onImageLoad}
                testId={`${testId}-image`}
                ariaDescription={`Image of ${title}`}
                autoFetchWiki={true}
                itemTitle={title}
              />
            ) : (
              <PlaceholderImage
                src={image}
                placeholder={imagePlaceholder}
                alt={imageAlt || title}
                onError={onImageError}
                onLoad={onImageLoad}
                testId={`${testId}-grid-image`}
                seed={title}
              />
            ))}

            {/* Title overlay (default for grid/compact) */}
            {showOverlay && (
              <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 via-black/70 to-transparent p-2">
                <p className={cn(
                  "font-heading text-white truncate",
                  layout === "grid" ? "text-2xs" : "text-xs"
                )}>
                  {title}
                </p>
                {subtitle && (
                  <p className="text-2xs text-gray-400 truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Custom overlay content */}
            {overlayContent && (
              <div className="absolute inset-0">
                {overlayContent}
              </div>
            )}

            {/* Actions */}
            {actions && (
              <div className={actionsPositionClasses[actionsPosition]}>
                {actions}
              </div>
            )}

            {/* Score content overlay */}
            {scoreContent && (
              <div className={cn(
                "absolute z-10 pointer-events-none",
                scorePosition === "top-right" && "top-1 right-1",
                scorePosition === "bottom" && "bottom-0 left-0 right-0 p-1 bg-linear-to-t from-black/80 to-transparent",
                !scorePosition && "bottom-0 left-0 right-0 p-1 bg-linear-to-t from-black/80 to-transparent"
              )}>
                {scoreContent}
              </div>
            )}

            {/* Hover indicator */}
            {hoverEffect !== "none" && (
              <div className="absolute inset-0 bg-brand/0 hover:bg-brand/10 transition-colors pointer-events-none" />
            )}
          </>
        )}
      </>
    );

    // Common props for the wrapper
    const commonWrapperProps = {
      role,
      'aria-label': ariaLabel || title,
      'aria-description': ariaDescription || subtitle,
      tabIndex: interactive !== "static" ? tabIndex : undefined,
      'data-testid': testId || `item-card-${title.toLowerCase().replace(/\s+/g, "-")}`,
      className: cardClassName,
      onClick: handleFlipClick,
      onKeyDown: handleKeyDown,
    };

    // Flip wrapper content
    const flipWrappedContent = enableFlip && flipContent ? (
      <div style={{ perspective: '800px' }} className="w-full h-full">
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Front face */}
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
            {cardContent}
          </div>
          {/* Back face */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden bg-gray-900"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {flipContent}
          </div>
        </motion.div>
      </div>
    ) : cardContent;

    // Return motion.div or regular div based on animated prop
    if (animated) {
      return (
        <motion.div
          ref={ref}
          {...commonWrapperProps}
          initial={layout === "list" ? { opacity: 0, x: -20 } : { opacity: 0, scale: 0.9 }}
          animate={layout === "list" ? { opacity: 1, x: 0 } : { opacity: 1, scale: 1 }}
          transition={{ delay: animationDelay }}
        >
          {flipWrappedContent}
        </motion.div>
      );
    }

    return (
      <div ref={ref} {...commonWrapperProps}>
        {flipWrappedContent}
      </div>
    );
  }
);

ItemCard.displayName = "ItemCard";

export { itemCardVariants };
