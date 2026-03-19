"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "../skeleton";
import { ItemCardContent } from "./ItemCardContent";
import { ItemCardFlip } from "./ItemCardFlip";

/**
 * ItemCard - Lightweight, composable card for displaying items in grids and lists.
 *
 * USE THIS WHEN:
 * - Rendering items in the match grid, backlog sidebar, or any dense item layout
 * - You need a thin, performant card with minimal overhead
 * - You want full control over actions, overlays, and score content via render props
 * - The card is used inside drag-and-drop contexts (supports draggable interactive mode)
 *
 * DO NOT USE WHEN:
 * - You need built-in hover expansion, quick action buttons, metadata badges,
 *   mini image galleries, or status indicators -- use RichItemCard instead
 *   (@/components/RichItemCard)
 *
 * HOW IT DIFFERS FROM RichItemCard:
 * - ItemCard is a **thin composition wrapper** (ItemCardContent + ItemCardFlip + animation).
 *   It renders what you give it and nothing more.
 * - RichItemCard is a **feature-rich, self-contained** card with built-in expand/collapse,
 *   quick actions, metadata badges, gallery, indicators, keyboard shortcuts, and flip reveal.
 * - ItemCard accepts raw props (title, image, actions ReactNode). RichItemCard accepts
 *   structured data (RichItemData object, QuickActionConfig[], MetadataBadgeData[]).
 * - If you find yourself recreating RichItemCard features on top of ItemCard, migrate
 *   to RichItemCard instead.
 *
 * REQUIRED PROPS: title
 * KEY OPTIONAL PROPS: image, variant, layout, interactive, state, actions, enableFlip,
 *   flipContent, scoreContent, animated
 */

/**
 * ItemCard Variants
 * Defines visual styles for different card layouts and states
 */
const itemCardVariants = cva(
  "relative rounded-lg overflow-hidden transition-all",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--surface-card)] border border-[var(--border-card)] hover:border-brand hover:shadow-lg hover:shadow-brand/20",
        ghost: "bg-transparent hover:bg-[var(--surface-overlay)]",
        solid:
          "bg-[var(--surface-deep)] border-2 border-[var(--surface-card)] hover:border-brand-hover",
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
        dragging: "opacity-50 scale-95 z-drag",
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
  title: string;
  subtitle?: string;
  image?: string | null;
  imageAlt?: string;
  loading?: boolean;
  actions?: React.ReactNode;
  actionsPosition?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "overlay";
  animated?: boolean;
  animationDelay?: number;
  imageComponent?: React.ReactNode;
  showOverlay?: boolean;
  overlayContent?: React.ReactNode;
  ariaLabel?: string;
  ariaDescription?: string;
  role?: string;
  tabIndex?: number;
  testId?: string;
  hoverEffect?: "none" | "subtle" | "strong";
  focusRing?: boolean;
  progressive?: boolean;
  imagePlaceholder?: string;
  onImageError?: () => void;
  onImageLoad?: () => void;
  enableFlip?: boolean;
  flipContent?: React.ReactNode;
  scoreContent?: React.ReactNode;
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
      <div
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-card-subtle)]",
          className
        )}
      >
        <Skeleton className="w-12 h-12 rounded shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden bg-[var(--surface-card)] border border-[var(--border-card)]",
        layout === "grid" ? "aspect-4/5" : "aspect-video",
        className
      )}
    >
      <Skeleton className="w-full h-full" />
    </div>
  );
}

/**
 * ItemCard Component
 *
 * A thin composition wrapper that assembles ItemCardContent, ItemCardFlip,
 * and animation concerns into a single cohesive card component.
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
      ? () => setIsFlipped((prev) => !prev)
      : onClick;

    if (loading) {
      return (
        <ItemCardSkeleton layout={layout || "grid"} className={className} />
      );
    }

    const hoverEffectClasses = {
      none: "",
      subtle: "hover:scale-[1.02]",
      strong: "hover:scale-105 hover:shadow-2xl",
    };

    const cardClassName = cn(
      itemCardVariants({ variant, layout, interactive, state }),
      focusRing && "focus-ring",
      hoverEffectClasses[hoverEffect],
      className
    );

    const cardContent = (
      <ItemCardContent
        layout={layout || "grid"}
        title={title}
        subtitle={subtitle}
        image={image}
        imageAlt={imageAlt}
        imageComponent={imageComponent}
        progressive={progressive}
        imagePlaceholder={imagePlaceholder}
        onImageError={onImageError}
        onImageLoad={onImageLoad}
        testId={testId}
        showOverlay={showOverlay}
        overlayContent={overlayContent}
        actions={actions}
        actionsPosition={actionsPosition}
        scoreContent={scoreContent}
        scorePosition={scorePosition}
        hoverEffect={hoverEffect}
      />
    );

    const flipWrappedContent =
      enableFlip && flipContent ? (
        <ItemCardFlip isFlipped={isFlipped} flipContent={flipContent}>
          {cardContent}
        </ItemCardFlip>
      ) : (
        cardContent
      );

    const commonWrapperProps = {
      role,
      "aria-label": ariaLabel || title,
      "aria-description": ariaDescription || subtitle,
      tabIndex: interactive !== "static" ? tabIndex : undefined,
      "data-testid":
        testId ||
        `item-card-${title.toLowerCase().replace(/\s+/g, "-")}`,
      className: cardClassName,
      onClick: handleFlipClick,
      onKeyDown: handleKeyDown,
    };

    if (animated) {
      return (
        <motion.div
          ref={ref}
          {...commonWrapperProps}
          initial={
            layout === "list"
              ? { opacity: 0, x: -20 }
              : { opacity: 0, scale: 0.9 }
          }
          animate={
            layout === "list"
              ? { opacity: 1, x: 0 }
              : { opacity: 1, scale: 1 }
          }
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
