"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Animation timing constants
const BLUR_EXIT_DURATION = 0.4;
const IMAGE_FADE_DURATION = 0.5;
const BLUR_SCALE = 1.1; // Scale up slightly to cover edges during blur

// Default placeholder images with variety - using placeholder.com style
const DEFAULT_PLACEHOLDERS = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%231a1a2e' width='100' height='100'/%3E%3Ccircle fill='%2316213e' cx='50' cy='50' r='35'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%230f1419' width='100' height='100'/%3E%3Crect fill='%231e2936' x='20' y='20' width='60' height='60' rx='8'/%3E%3C/svg%3E",
];

export interface PlaceholderImageProps {
  /** High-resolution image source */
  src?: string | null;
  /** Low-resolution placeholder image (optional - uses default if not provided) */
  placeholder?: string;
  /** Alt text for the image */
  alt: string;
  /** Additional CSS classes for the image */
  className?: string;
  /** CSS classes for the container */
  containerClassName?: string;
  /** Callback when high-res image fails to load */
  onError?: () => void;
  /** Callback when high-res image loads successfully */
  onLoad?: () => void;
  /** Show loading state */
  loading?: boolean;
  /** Test ID for automated testing */
  testId?: string;
  /** Load image immediately instead of waiting for intersection */
  eager?: boolean;
  /** Threshold for intersection observer (0-1) */
  intersectionThreshold?: number;
  /** Root margin for intersection observer */
  intersectionRootMargin?: string;
  /** Custom fallback component when no image is available */
  fallbackComponent?: React.ReactNode;
  /** Blur amount for placeholder (in pixels) */
  blurAmount?: number;
  /** Aspect ratio (e.g., "1/1", "16/9", "4/3") */
  aspectRatio?: string;
  /** Seed for consistent placeholder selection */
  seed?: string | number;
}

/**
 * PlaceholderImage Component
 *
 * A reusable component that displays a blurred low-resolution placeholder
 * while the high-resolution image loads. Uses intersection observer for
 * lazy loading and applies a smooth fade transition.
 *
 * Features:
 * - Blur-up effect with smooth transition
 * - Intersection observer for lazy loading
 * - Fallback to default placeholder when no image source
 * - Customizable blur amount and transitions
 * - Accessible with proper aria attributes
 */
export const PlaceholderImage = React.forwardRef<HTMLDivElement, PlaceholderImageProps>(
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
      intersectionThreshold = 0.1,
      intersectionRootMargin = "100px",
      fallbackComponent,
      blurAmount = 20,
      aspectRatio,
      seed,
    },
    ref
  ) => {
    const [isInView, setIsInView] = useState(eager);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Generate consistent placeholder based on seed or alt text
    const getPlaceholder = useCallback(() => {
      if (placeholder) return placeholder;
      const seedValue = seed || alt || "";
      const hash = String(seedValue).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return DEFAULT_PLACEHOLDERS[hash % DEFAULT_PLACEHOLDERS.length];
    }, [placeholder, seed, alt]);

    // Intersection observer for lazy loading
    useEffect(() => {
      if (eager || !containerRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              observer.disconnect();
            }
          });
        },
        {
          threshold: intersectionThreshold,
          rootMargin: intersectionRootMargin,
        }
      );

      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }, [eager, intersectionThreshold, intersectionRootMargin]);

    // Reset states when src changes
    useEffect(() => {
      setImageLoaded(false);
      setImageError(false);
    }, [src]);

    const handleImageLoad = useCallback(() => {
      setImageLoaded(true);
      onLoad?.();
    }, [onLoad]);

    const handleImageError = useCallback(() => {
      setImageError(true);
      onError?.();
    }, [onError]);

    const showPlaceholder = !src || imageError;
    const showBlur = !imageLoaded && !showPlaceholder;
    const currentPlaceholder = getPlaceholder();

    // Merge refs
    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <div
        ref={mergedRef}
        className={cn(
          "relative w-full h-full overflow-hidden bg-gray-900",
          containerClassName
        )}
        style={aspectRatio ? { aspectRatio } : undefined}
        data-testid={testId || "placeholder-image"}
        role="img"
        aria-label={alt}
      >
        {/* Blur-up placeholder layer */}
        <AnimatePresence>
          {(showBlur || showPlaceholder) && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: BLUR_EXIT_DURATION, ease: "easeOut" }}
              className="absolute inset-0"
              style={{
                transform: `scale(${BLUR_SCALE})`,
                filter: `blur(${blurAmount}px)`,
              }}
              data-testid={`${testId || "placeholder-image"}-blur`}
              aria-hidden="true"
            >
              {showPlaceholder && fallbackComponent ? (
                <div className="w-full h-full flex items-center justify-center">
                  {fallbackComponent}
                </div>
              ) : (
                <img
                  src={currentPlaceholder}
                  alt=""
                  className={cn("w-full h-full object-cover", className)}
                  draggable={false}
                  aria-hidden="true"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient overlay for missing images */}
        {showPlaceholder && !fallbackComponent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.95))",
            }}
            data-testid={`${testId || "placeholder-image"}-fallback`}
          >
            <div className="text-center">
              <div
                className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(34, 211, 238, 0.1))",
                }}
              >
                <svg
                  className="w-5 h-5 text-cyan-500/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-xs text-slate-500 font-medium">No Image</span>
            </div>
          </motion.div>
        )}

        {/* High-resolution image */}
        {!showPlaceholder && isInView && src && (
          <motion.img
            ref={imgRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: IMAGE_FADE_DURATION, ease: "easeOut" }}
            src={src}
            alt={alt}
            className={cn("absolute inset-0 w-full h-full object-cover", className)}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading={eager ? "eager" : "lazy"}
            draggable={false}
            data-testid={`${testId || "placeholder-image"}-main`}
          />
        )}

        {/* Loading shimmer overlay */}
        {loading && !imageLoaded && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(
                105deg,
                transparent 40%,
                rgba(255, 255, 255, 0.05) 50%,
                transparent 60%
              )`,
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            data-testid={`${testId || "placeholder-image"}-loading`}
          />
        )}
      </div>
    );
  }
);

PlaceholderImage.displayName = "PlaceholderImage";

export default PlaceholderImage;
