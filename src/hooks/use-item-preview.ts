'use client';

/**
 * useItemPreview Hook
 * Manages item preview state and interactions for RichItemCard.
 * Handles expand/collapse, gallery navigation, and keyboard shortcuts.
 */

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';

/**
 * Item data for preview
 */
export interface PreviewItemData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string | null;
  images?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Preview state
 */
export interface PreviewState {
  /** Whether preview is expanded */
  isExpanded: boolean;
  /** Whether item is hovered */
  isHovered: boolean;
  /** Whether item is focused */
  isFocused: boolean;
  /** Current gallery index */
  galleryIndex: number;
  /** Whether preview is loading */
  isLoading: boolean;
}

/**
 * Preview configuration
 */
export interface PreviewConfig {
  /** Enable expand on hover */
  expandOnHover?: boolean;
  /** Enable expand on click */
  expandOnClick?: boolean;
  /** Delay before expand (ms) */
  expandDelay?: number;
  /** Auto-close delay (ms, 0 to disable) */
  autoCloseDelay?: number;
  /** Enable gallery auto-advance */
  galleryAutoAdvance?: boolean;
  /** Gallery auto-advance interval (ms) */
  galleryInterval?: number;
  /** Enable keyboard shortcuts */
  enableKeyboard?: boolean;
  /** Callback when expanded */
  onExpand?: (item: PreviewItemData) => void;
  /** Callback when collapsed */
  onCollapse?: (item: PreviewItemData) => void;
  /** Callback when gallery index changes */
  onGalleryChange?: (index: number, item: PreviewItemData) => void;
}

/**
 * Preview actions
 */
export interface PreviewActions {
  /** Expand preview */
  expand: () => void;
  /** Collapse preview */
  collapse: () => void;
  /** Toggle expand state */
  toggle: () => void;
  /** Set hover state */
  setHovered: (hovered: boolean) => void;
  /** Set focus state */
  setFocused: (focused: boolean) => void;
  /** Go to next gallery image */
  nextImage: () => void;
  /** Go to previous gallery image */
  prevImage: () => void;
  /** Go to specific gallery image */
  goToImage: (index: number) => void;
  /** Handle keyboard event */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** Reset state */
  reset: () => void;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PreviewConfig = {
  expandOnHover: true,
  expandOnClick: true,
  expandDelay: 300,
  autoCloseDelay: 0,
  galleryAutoAdvance: false,
  galleryInterval: 3000,
  enableKeyboard: true,
};

/**
 * useItemPreview Hook
 *
 * Manages all preview-related state and interactions for item cards.
 *
 * Features:
 * - Expand/collapse with configurable triggers
 * - Gallery navigation
 * - Keyboard shortcuts
 * - Auto-close functionality
 * - Event callbacks
 */
export function useItemPreview(
  item: PreviewItemData,
  config?: PreviewConfig
): [PreviewState, PreviewActions] {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for timers
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const galleryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Image count for gallery
  const imageCount = item.images?.length || 0;

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (galleryIntervalRef.current) clearInterval(galleryIntervalRef.current);
    };
  }, []);

  // Gallery auto-advance
  useEffect(() => {
    if (
      mergedConfig.galleryAutoAdvance &&
      isExpanded &&
      imageCount > 1
    ) {
      galleryIntervalRef.current = setInterval(() => {
        setGalleryIndex((prev) => (prev + 1) % imageCount);
      }, mergedConfig.galleryInterval);
    }

    return () => {
      if (galleryIntervalRef.current) {
        clearInterval(galleryIntervalRef.current);
      }
    };
  }, [isExpanded, imageCount, mergedConfig.galleryAutoAdvance, mergedConfig.galleryInterval]);

  // Auto-close after delay
  useEffect(() => {
    if (isExpanded && mergedConfig.autoCloseDelay && mergedConfig.autoCloseDelay > 0) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
        mergedConfig.onCollapse?.(item);
      }, mergedConfig.autoCloseDelay);
    }

    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [isExpanded, mergedConfig, item]);

  // Actions
  const expand = useCallback(() => {
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
    }
    setIsExpanded(true);
    mergedConfig.onExpand?.(item);
  }, [mergedConfig, item]);

  const collapse = useCallback(() => {
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
    }
    setIsExpanded(false);
    mergedConfig.onCollapse?.(item);
  }, [mergedConfig, item]);

  const toggle = useCallback(() => {
    if (isExpanded) {
      collapse();
    } else {
      expand();
    }
  }, [isExpanded, expand, collapse]);

  const handleSetHovered = useCallback(
    (hovered: boolean) => {
      setIsHovered(hovered);

      if (hovered && mergedConfig.expandOnHover) {
        expandTimeoutRef.current = setTimeout(() => {
          expand();
        }, mergedConfig.expandDelay);
      } else if (!hovered && !mergedConfig.expandOnClick) {
        collapse();
      }

      if (!hovered && expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
    },
    [mergedConfig, expand, collapse]
  );

  const handleSetFocused = useCallback((focused: boolean) => {
    setIsFocused(focused);
  }, []);

  const nextImage = useCallback(() => {
    if (imageCount > 1) {
      const newIndex = (galleryIndex + 1) % imageCount;
      setGalleryIndex(newIndex);
      mergedConfig.onGalleryChange?.(newIndex, item);
    }
  }, [galleryIndex, imageCount, mergedConfig, item]);

  const prevImage = useCallback(() => {
    if (imageCount > 1) {
      const newIndex = galleryIndex > 0 ? galleryIndex - 1 : imageCount - 1;
      setGalleryIndex(newIndex);
      mergedConfig.onGalleryChange?.(newIndex, item);
    }
  }, [galleryIndex, imageCount, mergedConfig, item]);

  const goToImage = useCallback(
    (index: number) => {
      if (index >= 0 && index < imageCount) {
        setGalleryIndex(index);
        mergedConfig.onGalleryChange?.(index, item);
      }
    },
    [imageCount, mergedConfig, item]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!mergedConfig.enableKeyboard) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          toggle();
          break;
        case 'Escape':
          if (isExpanded) {
            e.preventDefault();
            collapse();
          }
          break;
        case 'ArrowLeft':
          if (isExpanded && imageCount > 1) {
            e.preventDefault();
            prevImage();
          }
          break;
        case 'ArrowRight':
          if (isExpanded && imageCount > 1) {
            e.preventDefault();
            nextImage();
          }
          break;
      }
    },
    [mergedConfig.enableKeyboard, toggle, isExpanded, collapse, imageCount, prevImage, nextImage]
  );

  const reset = useCallback(() => {
    setIsExpanded(false);
    setIsHovered(false);
    setIsFocused(false);
    setGalleryIndex(0);
    setIsLoading(false);

    if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (galleryIntervalRef.current) clearInterval(galleryIntervalRef.current);
  }, []);

  // Memoize state
  const state = useMemo<PreviewState>(
    () => ({
      isExpanded,
      isHovered,
      isFocused,
      galleryIndex,
      isLoading,
    }),
    [isExpanded, isHovered, isFocused, galleryIndex, isLoading]
  );

  // Memoize actions
  const actions = useMemo<PreviewActions>(
    () => ({
      expand,
      collapse,
      toggle,
      setHovered: handleSetHovered,
      setFocused: handleSetFocused,
      nextImage,
      prevImage,
      goToImage,
      handleKeyDown,
      reset,
    }),
    [
      expand,
      collapse,
      toggle,
      handleSetHovered,
      handleSetFocused,
      nextImage,
      prevImage,
      goToImage,
      handleKeyDown,
      reset,
    ]
  );

  return [state, actions];
}

/**
 * Hook for managing multiple item previews
 * Ensures only one item is expanded at a time
 */
export function usePreviewManager<T extends PreviewItemData>(
  items: T[]
): {
  expandedId: string | null;
  expand: (id: string) => void;
  collapse: () => void;
  isExpanded: (id: string) => boolean;
} {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const expand = useCallback((id: string) => {
    setExpandedId(id);
  }, []);

  const collapse = useCallback(() => {
    setExpandedId(null);
  }, []);

  const isExpanded = useCallback(
    (id: string) => expandedId === id,
    [expandedId]
  );

  return {
    expandedId,
    expand,
    collapse,
    isExpanded,
  };
}

export default useItemPreview;
