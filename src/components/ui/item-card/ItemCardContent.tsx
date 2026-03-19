"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { ItemCardImage } from "./ItemCardImage";

export interface ItemCardContentProps {
  /** Layout variant */
  layout: "grid" | "list" | "compact";
  /** Main title text */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Image URL */
  image?: string | null;
  /** Alt text for the image */
  imageAlt?: string;
  /** Custom image component override */
  imageComponent?: React.ReactNode;
  /** Use progressive image loading */
  progressive?: boolean;
  /** Low-res placeholder for progressive loading */
  imagePlaceholder?: string;
  /** Callback when image fails to load */
  onImageError?: () => void;
  /** Callback when image loads successfully */
  onImageLoad?: () => void;
  /** Test ID prefix */
  testId?: string;
  /** Show overlay gradient on image */
  showOverlay?: boolean;
  /** Custom overlay content */
  overlayContent?: React.ReactNode;
  /** Custom actions/buttons */
  actions?: React.ReactNode;
  /** Position for action buttons */
  actionsPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "overlay";
  /** Score content overlay */
  scoreContent?: React.ReactNode;
  /** Position for score display */
  scorePosition?: "bottom" | "top-right";
  /** Hover effect intensity */
  hoverEffect?: "none" | "subtle" | "strong";
}

const actionsPositionClasses = {
  "top-right": "absolute top-2 right-2",
  "top-left": "absolute top-2 left-2",
  "bottom-right": "absolute bottom-2 right-2",
  "bottom-left": "absolute bottom-2 left-2",
  overlay:
    "absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity",
};

/**
 * ItemCardContent
 *
 * Renders the layout-specific content for an ItemCard.
 * Handles list vs grid/compact layout branching, title overlay,
 * actions positioning, and score overlays.
 */
export function ItemCardContent({
  layout,
  title,
  subtitle,
  image,
  imageAlt,
  imageComponent,
  progressive = false,
  imagePlaceholder,
  onImageError,
  onImageLoad,
  testId,
  showOverlay = true,
  overlayContent,
  actions,
  actionsPosition = "top-right",
  scoreContent,
  scorePosition,
  hoverEffect = "subtle",
}: ItemCardContentProps) {
  if (layout === "list") {
    return (
      <>
        <ItemCardImage
          src={image}
          placeholder={imagePlaceholder}
          alt={imageAlt || title}
          progressive={progressive}
          onError={onImageError}
          onLoad={onImageLoad}
          testId={testId}
          layout="list"
          itemTitle={title}
          imageComponent={imageComponent}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-heading text-white truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </>
    );
  }

  // Grid / Compact layout
  return (
    <>
      <ItemCardImage
        src={image}
        placeholder={imagePlaceholder}
        alt={imageAlt || title}
        progressive={progressive}
        onError={onImageError}
        onLoad={onImageLoad}
        testId={testId}
        layout={layout}
        itemTitle={title}
        imageComponent={imageComponent}
      />

      {showOverlay && (
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 via-black/70 to-transparent p-2">
          <p
            className={cn(
              "font-heading text-white truncate",
              layout === "grid" ? "text-2xs" : "text-xs"
            )}
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-2xs text-gray-400 truncate mt-0.5">{subtitle}</p>
          )}
        </div>
      )}

      {overlayContent && (
        <div className="absolute inset-0">{overlayContent}</div>
      )}

      {actions && (
        <div className={actionsPositionClasses[actionsPosition]}>
          {actions}
        </div>
      )}

      {scoreContent && (
        <div
          className={cn(
            "absolute z-10 pointer-events-none",
            scorePosition === "top-right" && "top-1 right-1",
            scorePosition === "bottom" &&
              "bottom-0 left-0 right-0 p-1 bg-linear-to-t from-black/80 to-transparent",
            !scorePosition &&
              "bottom-0 left-0 right-0 p-1 bg-linear-to-t from-black/80 to-transparent"
          )}
        >
          {scoreContent}
        </div>
      )}

      {hoverEffect !== "none" && (
        <div className="absolute inset-0 bg-brand/0 hover:bg-brand/10 transition-colors pointer-events-none" />
      )}
    </>
  );
}
