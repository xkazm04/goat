'use client';

/**
 * MiniGallery
 * Image carousel preview for item cards.
 * Provides quick navigation through multiple item images.
 */

import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Props for MiniGallery component
 */
export interface MiniGalleryProps {
  /** Array of image URLs */
  images: string[];
  /** Currently active image index */
  activeIndex: number;
  /** Callback when index changes */
  onIndexChange: (index: number) => void;
  /** Auto-advance interval (ms, 0 to disable) */
  autoAdvance?: number;
  /** Show navigation arrows */
  showArrows?: boolean;
  /** Show dot indicators */
  showDots?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * MiniGallery Component
 *
 * A compact image gallery for item cards.
 * Allows users to quickly browse through multiple images.
 *
 * Features:
 * - Dot navigation
 * - Arrow buttons
 * - Keyboard navigation (via parent)
 * - Auto-advance option
 * - Smooth transitions
 */
export const MiniGallery = memo(function MiniGallery({
  images,
  activeIndex,
  onIndexChange,
  autoAdvance = 0,
  showArrows = true,
  showDots = true,
  className,
}: MiniGalleryProps) {
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance logic
  useEffect(() => {
    if (autoAdvance > 0 && !isPaused && images.length > 1) {
      autoAdvanceRef.current = setInterval(() => {
        onIndexChange((activeIndex + 1) % images.length);
      }, autoAdvance);
    }

    return () => {
      if (autoAdvanceRef.current) {
        clearInterval(autoAdvanceRef.current);
      }
    };
  }, [autoAdvance, activeIndex, images.length, isPaused, onIndexChange]);

  // Pause on hover
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Navigation handlers
  const handlePrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newIndex = activeIndex > 0 ? activeIndex - 1 : images.length - 1;
      onIndexChange(newIndex);
    },
    [activeIndex, images.length, onIndexChange]
  );

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newIndex = activeIndex < images.length - 1 ? activeIndex + 1 : 0;
      onIndexChange(newIndex);
    },
    [activeIndex, images.length, onIndexChange]
  );

  const handleDotClick = useCallback(
    (index: number) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onIndexChange(index);
    },
    [onIndexChange]
  );

  if (images.length <= 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'absolute inset-x-0 bottom-0',
        'flex flex-col gap-1 p-2',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="mini-gallery"
    >
      {/* Navigation arrows */}
      {showArrows && (
        <>
          <motion.button
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrev}
            className={cn(
              'absolute left-1 top-1/2 -translate-y-1/2 z-10',
              'w-6 h-6 rounded-full',
              'bg-black/60 backdrop-blur-sm',
              'flex items-center justify-center',
              'text-white/80 hover:text-white hover:bg-black/80',
              'transition-colors'
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <motion.button
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNext}
            className={cn(
              'absolute right-1 top-1/2 -translate-y-1/2 z-10',
              'w-6 h-6 rounded-full',
              'bg-black/60 backdrop-blur-sm',
              'flex items-center justify-center',
              'text-white/80 hover:text-white hover:bg-black/80',
              'transition-colors'
            )}
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </>
      )}

      {/* Dot indicators */}
      {showDots && (
        <div className="flex items-center justify-center gap-1">
          {images.map((_, index) => (
            <motion.button
              key={index}
              initial={{ scale: 0.8 }}
              animate={{
                scale: index === activeIndex ? 1 : 0.8,
                opacity: index === activeIndex ? 1 : 0.5,
              }}
              whileHover={{ scale: 1.1 }}
              onClick={handleDotClick(index)}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                index === activeIndex
                  ? 'bg-white'
                  : 'bg-white/50 hover:bg-white/70'
              )}
              aria-label={`Go to image ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}

      {/* Image counter */}
      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white/80 font-medium">
        {activeIndex + 1}/{images.length}
      </div>
    </motion.div>
  );
});

/**
 * Thumbnail strip variant
 */
export const ThumbnailStrip = memo(function ThumbnailStrip({
  images,
  activeIndex,
  onIndexChange,
  maxVisible = 4,
  className,
}: {
  images: string[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  maxVisible?: number;
  className?: string;
}) {
  const visibleImages = images.slice(0, maxVisible);
  const hasMore = images.length > maxVisible;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn('flex items-center gap-1', className)}
    >
      {visibleImages.map((image, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index);
          }}
          className={cn(
            'w-8 h-8 rounded overflow-hidden border-2 transition-colors',
            index === activeIndex
              ? 'border-cyan-400'
              : 'border-transparent hover:border-gray-500'
          )}
        >
          <img
            src={image}
            alt={`Thumbnail ${index + 1}`}
            className="w-full h-full object-cover"
          />
        </motion.button>
      ))}
      {hasMore && (
        <div className="w-8 h-8 rounded bg-gray-700/50 flex items-center justify-center text-xs text-gray-400">
          +{images.length - maxVisible}
        </div>
      )}
    </motion.div>
  );
});

export default MiniGallery;
