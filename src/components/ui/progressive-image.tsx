"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useProgressiveWikiImage } from "@/hooks/use-progressive-wiki-image";

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
    },
    ref
  ) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const { imageUrl: wikiImageUrl, isFetching: wikiIsFetching } = useProgressiveWikiImage({
      itemTitle: itemTitle || alt,
      existingImage: src,
      autoFetch: autoFetchWiki,
      fetchDelay: 500,
    });

    const finalSrc = src || (autoFetchWiki ? wikiImageUrl : null);
    const [currentSrc, setCurrentSrc] = useState<string | null>(finalSrc);

    useEffect(() => {
      setCurrentSrc(finalSrc);
      setImageLoaded(false);
      setImageError(false);
    }, [finalSrc]);

    const handleImageLoad = () => {
      setImageLoaded(true);
      onLoad?.();
    };

    const handleImageError = () => {
      setImageError(true);
      onError?.();
    };

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
        aria-description={ariaDescription}
      >
        <AnimatePresence>
          {!imageLoaded && !showFallback && placeholder && (
            <motion.img
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              src={placeholder}
              alt="Loading placeholder"
              className={cn(
                "absolute inset-0 w-full h-full object-cover blur-md scale-110",
                className
              )}
              style={{ clipPath: "inset(0)" }}
              draggable={false}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {!showFallback && currentSrc && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            src={currentSrc}
            alt={alt}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              className
            )}
            style={{ clipPath: "inset(0)" }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading={eager ? "eager" : "lazy"}
            draggable={false}
            data-testid="progressive-image-main"
          />
        )}

        {showFallback && !wikiIsFetching && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-gray-900"
            data-testid="progressive-image-fallback"
          >
            {fallbackComponent || (
              <span className="text-xs text-gray-500">No Image</span>
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
