"use client";

/**
 * LongPressPreview
 * Item detail preview card that appears on long-press hold
 * Shows expanded item information with smooth entrance animation
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X, Star, Calendar, Info, ExternalLink, Award } from "lucide-react";
import { ProgressiveImage } from "@/components/ui/progressive-image";

/**
 * Preview item data
 */
export interface PreviewItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string | null;
  metadata?: {
    year?: number | string;
    rating?: number;
    category?: string;
    tags?: string[];
    [key: string]: unknown;
  };
  wikiUrl?: string;
}

/**
 * Preview position for anchoring
 */
export interface PreviewPosition {
  x: number;
  y: number;
  anchor: "top" | "bottom" | "left" | "right" | "center";
}

/**
 * LongPressPreview props
 */
interface LongPressPreviewProps {
  /** Item to preview */
  item: PreviewItem | null;
  /** Whether preview is visible */
  isVisible: boolean;
  /** Position to anchor preview */
  position?: PreviewPosition;
  /** Called when preview should close */
  onClose: () => void;
  /** Called when item is selected from preview */
  onSelect?: (item: PreviewItem) => void;
  /** Called when compare action is triggered */
  onCompare?: (item: PreviewItem) => void;
  /** Enable backdrop blur */
  backdropBlur?: boolean;
  /** Enable close on outside tap */
  closeOnOutsideTap?: boolean;
  /** Animation variant */
  variant?: "scale" | "slide" | "fade";
}

/**
 * Calculate optimal preview position
 */
function calculatePreviewPosition(
  position: PreviewPosition | undefined,
  previewRect: DOMRect | null
): { top: string; left: string; transform: string } {
  if (!position) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const { x, y, anchor } = position;
  const padding = 16;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
  const previewWidth = previewRect?.width || 320;
  const previewHeight = previewRect?.height || 400;

  let top = y;
  let left = x;
  let transform = "";

  switch (anchor) {
    case "top":
      // Preview appears below the touch point
      top = y + padding;
      left = Math.max(padding, Math.min(x - previewWidth / 2, viewportWidth - previewWidth - padding));
      break;
    case "bottom":
      // Preview appears above the touch point
      top = Math.max(padding, y - previewHeight - padding);
      left = Math.max(padding, Math.min(x - previewWidth / 2, viewportWidth - previewWidth - padding));
      break;
    case "left":
      // Preview appears to the right
      left = x + padding;
      top = Math.max(padding, Math.min(y - previewHeight / 2, viewportHeight - previewHeight - padding));
      break;
    case "right":
      // Preview appears to the left
      left = Math.max(padding, x - previewWidth - padding);
      top = Math.max(padding, Math.min(y - previewHeight / 2, viewportHeight - previewHeight - padding));
      break;
    case "center":
    default:
      left = viewportWidth / 2 - previewWidth / 2;
      top = viewportHeight / 2 - previewHeight / 2;
      break;
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
    transform: "",
  };
}

/**
 * Animation variants
 */
const variants = {
  scale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  },
  slide: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

/**
 * LongPressPreview Component
 */
export function LongPressPreview({
  item,
  isVisible,
  position,
  onClose,
  onSelect,
  onCompare,
  backdropBlur = true,
  closeOnOutsideTap = true,
  variant = "scale",
}: LongPressPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle mount for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Measure preview for positioning
  useEffect(() => {
    if (previewRef.current && isVisible) {
      setPreviewRect(previewRef.current.getBoundingClientRect());
    }
  }, [isVisible]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, onClose]);

  // Handle outside tap
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (closeOnOutsideTap && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnOutsideTap, onClose]
  );

  // Prevent touch events from propagating
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
  }, []);

  if (!mounted) return null;
  if (!item) return null;

  const positionStyles = calculatePreviewPosition(position, previewRect);
  const animationVariant = variants[variant];

  const previewContent = (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-[100] ${
              backdropBlur ? "backdrop-blur-sm bg-black/40" : "bg-black/30"
            }`}
            onClick={handleBackdropClick}
            onTouchStart={handleBackdropClick as any}
          />

          {/* Preview Card */}
          <motion.div
            ref={previewRef}
            initial={animationVariant.initial}
            animate={animationVariant.animate}
            exit={animationVariant.exit}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed z-[101] w-80 max-w-[calc(100vw-32px)] rounded-2xl overflow-hidden shadow-2xl"
            style={positionStyles}
            onTouchStart={handleTouchStart}
          >
            {/* Card Container */}
            <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10">
              {/* Image Header */}
              <div className="relative aspect-[16/10] overflow-hidden">
                <ProgressiveImage
                  src={item.imageUrl}
                  alt={item.title}
                  itemTitle={item.title}
                  autoFetchWiki={true}
                  className="w-full h-full object-cover"
                  fallbackComponent={
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <Info className="w-12 h-12 text-gray-600" />
                    </div>
                  }
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-xl font-bold text-white leading-tight line-clamp-2">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-sm text-white/70 mt-1 line-clamp-1">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Metadata Row */}
                {item.metadata && (
                  <div className="flex flex-wrap gap-2">
                    {item.metadata.year && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 text-xs text-white/80">
                        <Calendar className="w-3 h-3" />
                        {item.metadata.year}
                      </span>
                    )}
                    {item.metadata.rating !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 text-xs text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        {item.metadata.rating.toFixed(1)}
                      </span>
                    )}
                    {item.metadata.category && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/20 text-xs text-cyan-400">
                        <Award className="w-3 h-3" />
                        {item.metadata.category}
                      </span>
                    )}
                  </div>
                )}

                {/* Tags */}
                {item.metadata?.tags && item.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.metadata.tags.slice(0, 5).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                {item.description && (
                  <p className="text-sm text-white/70 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {onSelect && (
                    <button
                      onClick={() => onSelect(item)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold transition-colors"
                    >
                      Select
                    </button>
                  )}
                  {onCompare && (
                    <button
                      onClick={() => onCompare(item)}
                      className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                    >
                      Compare
                    </button>
                  )}
                  {item.wikiUrl && (
                    <a
                      href={item.wikiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                      aria-label="Open in Wikipedia"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Use portal to render at document body level
  return typeof document !== "undefined"
    ? createPortal(previewContent, document.body)
    : null;
}

/**
 * Hook for managing long press preview state
 */
export function useLongPressPreview() {
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<PreviewPosition | undefined>();

  const showPreview = useCallback(
    (item: PreviewItem, pos?: PreviewPosition) => {
      setPreviewItem(item);
      setPosition(pos);
      setIsVisible(true);
    },
    []
  );

  const hidePreview = useCallback(() => {
    setIsVisible(false);
    // Delay clearing item for exit animation
    setTimeout(() => {
      setPreviewItem(null);
      setPosition(undefined);
    }, 200);
  }, []);

  return {
    previewItem,
    isVisible,
    position,
    showPreview,
    hidePreview,
  };
}

export default LongPressPreview;
