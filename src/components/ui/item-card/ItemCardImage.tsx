"use client";

import * as React from "react";

import { PlaceholderImage } from "../placeholder-image";
import { ProgressiveImage } from "../progressive-image";

export interface ItemCardImageProps {
  /** Image URL */
  src?: string | null;
  /** Low-res placeholder for progressive loading */
  placeholder?: string;
  /** Alt text for the image */
  alt: string;
  /** Use progressive image loading */
  progressive?: boolean;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Test ID prefix */
  testId?: string;
  /** Layout variant - affects container sizing */
  layout?: "grid" | "list" | "compact";
  /** Item title used for placeholder seed and wiki auto-fetch */
  itemTitle: string;
  /** Category used to pick the branded fallback gradient when no image resolves */
  category?: string | null;
  /** Custom image component override */
  imageComponent?: React.ReactNode;
}

/**
 * ItemCardImage
 *
 * Handles progressive/placeholder image rendering, deduplicated across
 * grid and list layout branches. Wraps ProgressiveImage or PlaceholderImage
 * based on the `progressive` prop.
 */
export function ItemCardImage({
  src,
  placeholder,
  alt,
  progressive = false,
  onError,
  onLoad,
  testId,
  layout = "grid",
  itemTitle,
  category,
  imageComponent,
}: ItemCardImageProps) {
  if (imageComponent) {
    return <>{imageComponent}</>;
  }

  const isListLayout = layout === "list";

  if (progressive) {
    const image = (
      <ProgressiveImage
        src={src}
        placeholder={placeholder}
        alt={alt}
        onError={onError}
        onLoad={onLoad}
        testId={testId ? `${testId}-image` : undefined}
        ariaDescription={`Image of ${itemTitle}`}
        autoFetchWiki={true}
        itemTitle={itemTitle}
        category={category}
      />
    );

    if (isListLayout) {
      return (
        <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-gray-900">
          {image}
        </div>
      );
    }

    return image;
  }

  const image = (
    <PlaceholderImage
      src={src}
      placeholder={placeholder}
      alt={alt}
      onError={onError}
      onLoad={onLoad}
      testId={testId ? `${testId}-${isListLayout ? "list" : "grid"}-image` : undefined}
      seed={itemTitle}
    />
  );

  if (isListLayout) {
    return (
      <div className="w-12 h-12 rounded overflow-hidden shrink-0">
        {image}
      </div>
    );
  }

  return image;
}
