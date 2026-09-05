"use client";

import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import { useId, useState } from "react";

import { useProgressiveWikiImage } from "@/hooks/use-progressive-wiki-image";
import { cn } from "@/lib/utils";

import { ImageFallback } from "./ImageFallback";

// Animation timing constants
const PLACEHOLDER_EXIT_DURATION = 0.3;
const IMAGE_FADE_DURATION = 0.4;
const WIKI_FETCH_DELAY = 500;

// Shared styles
const CLIP_PATH_INSET = "inset(0)";

export interface ProgressiveImageProps {
  src?: string | null;
  placeholder?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  onError?: () => void;
  onLoad?: () => void;
  loading?: boolean;
  testId?: string;
  eager?: boolean;
  ariaDescription?: string;
  fallbackComponent?: React.ReactNode;
  autoFetchWiki?: boolean;
  itemTitle?: string;
  /** Category used to pick the branded fallback gradient when no image resolves. */
  category?: string | null;
}

export const ProgressiveImage = React.forwardRef<HTMLDivElement, ProgressiveImageProps>(
  (
    {
      src,
      placeholder,
      alt,
      className,
      containerClassName,
      onError,
      onLoad,
      loading = false,
      testId,
      eager = false,
      ariaDescription,
      fallbackComponent,
      autoFetchWiki = true,
      itemTitle,
      category,
    },
    ref
  ) => {
    const { imageUrl: wikiImageUrl, isFetching: wikiIsFetching } = useProgressiveWikiImage({
      itemTitle: itemTitle || alt,
      existingImage: src,
      autoFetch: autoFetchWiki,
      fetchDelay: WIKI_FETCH_DELAY,
    });

    const currentSrc = src || (autoFetchWiki ? wikiImageUrl : null);

    // Load/error state is keyed by the URL it was reported FOR, so a change of
    // source invalidates it by derivation rather than by an effect that
    // re-renders to reset three flags. The previous shape (a `currentSrc`
    // mirror + `useEffect` resetting `imageLoaded`/`imageError`) painted one
    // frame with the old image's loaded flag applied to the new URL.
    const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
    const [erroredSrc, setErroredSrc] = useState<string | null>(null);
    const imageLoaded = currentSrc !== null && loadedSrc === currentSrc;
    const imageError = currentSrc !== null && erroredSrc === currentSrc;

    const handleImageLoad = () => {
      setLoadedSrc(currentSrc);
      onLoad?.();
    };

    const handleImageError = () => {
      setErroredSrc(currentSrc);
      onError?.();
    };

    // `aria-description` is not a supported attribute on role="img"; the
    // supported form is a described-by reference to text in the DOM.
    const descriptionId = useId();

    const showFallback = !currentSrc || imageError;
    const isLoading = loading || (!imageLoaded && !showFallback) || wikiIsFetching;

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full h-full overflow-hidden bg-gray-900",
          containerClassName
        )}
        data-testid={testId || "progressive-image"}
        role="img"
        aria-label={alt}
        aria-describedby={ariaDescription ? descriptionId : undefined}
      >
        {ariaDescription && (
          <span id={descriptionId} className="sr-only">
            {ariaDescription}
          </span>
        )}
        <AnimatePresence>
          {!imageLoaded && !showFallback && placeholder && (
            <motion.img
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: PLACEHOLDER_EXIT_DURATION }}
              src={placeholder}
              alt=""
              className={cn(
                "absolute inset-0 w-full h-full object-cover blur-md scale-110",
                className
              )}
              style={{ clipPath: CLIP_PATH_INSET }}
              draggable={false}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {!showFallback && currentSrc && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: IMAGE_FADE_DURATION, ease: "easeOut" }}
            src={currentSrc}
            alt={alt}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              className
            )}
            style={{ clipPath: CLIP_PATH_INSET }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading={eager ? "eager" : "lazy"}
            draggable={false}
            data-testid="progressive-image-main"
          />
        )}

        {showFallback && !wikiIsFetching && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            data-testid="progressive-image-fallback"
          >
            {fallbackComponent || (
              <ImageFallback title={itemTitle || alt || ""} category={category} size="sm" />
            )}
          </div>
        )}

        {isLoading && !imageLoaded && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse" data-testid="progressive-image-loading" />
        )}
      </div>
    );
  }
);

ProgressiveImage.displayName = "ProgressiveImage";
