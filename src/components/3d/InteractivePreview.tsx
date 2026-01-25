'use client';

/**
 * InteractivePreview - Click-to-expand preview component
 *
 * Creates an immersive preview experience with smooth expand/collapse
 * animations, backdrop blur, and escape key handling.
 */

import {
  memo,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionCapabilities } from '@/hooks/use-motion-preference';
import { X } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface InteractivePreviewProps {
  /** Thumbnail/collapsed content */
  children: ReactNode;
  /** Expanded preview content */
  previewContent: ReactNode;
  /** Preview title for accessibility */
  previewTitle?: string;
  /** Maximum width of expanded preview (default: 90vw) */
  maxWidth?: string;
  /** Maximum height of expanded preview (default: 90vh) */
  maxHeight?: string;
  /** Custom class for thumbnail wrapper */
  thumbnailClassName?: string;
  /** Custom class for preview wrapper */
  previewClassName?: string;
  /** Callback when preview opens */
  onOpen?: () => void;
  /** Callback when preview closes */
  onClose?: () => void;
  /** Disable the preview functionality */
  disabled?: boolean;
}

// =============================================================================
// Animation Variants
// =============================================================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const previewVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

const noMotionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// =============================================================================
// Main Component
// =============================================================================

export const InteractivePreview = memo(function InteractivePreview({
  children,
  previewContent,
  previewTitle = 'Preview',
  maxWidth = '90vw',
  maxHeight = '90vh',
  thumbnailClassName,
  previewClassName,
  onOpen,
  onClose,
  disabled = false,
}: InteractivePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const { allowTransitions, allowInteraction } = useMotionCapabilities();

  const effectsDisabled = disabled || !allowInteraction;
  const variants = allowTransitions ? previewVariants : noMotionVariants;

  const handleOpen = useCallback(() => {
    if (effectsDisabled) return;

    // Store current focus for restoration
    previousActiveElement.current = document.activeElement;

    setIsOpen(true);
    onOpen?.();

    // Lock body scroll
    document.body.style.overflow = 'hidden';
  }, [effectsDisabled, onOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();

    // Restore body scroll
    document.body.style.overflow = '';

    // Restore focus
    if (previousActiveElement.current instanceof HTMLElement) {
      previousActiveElement.current.focus();
    }
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !previewRef.current) return;

    const preview = previewRef.current;
    const focusableElements = preview.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleTabKey);
    return () => window.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  return (
    <>
      {/* Thumbnail/Trigger */}
      <div
        className={cn(
          'cursor-pointer transition-transform',
          !effectsDisabled && 'hover:scale-[1.02]',
          thumbnailClassName
        )}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        role="button"
        tabIndex={effectsDisabled ? -1 : 0}
        aria-label={`Open ${previewTitle}`}
        aria-expanded={isOpen}
      >
        {children}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={handleClose}
              aria-hidden="true"
            />

            {/* Preview Content */}
            <motion.div
              ref={previewRef}
              className={cn(
                'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                'overflow-auto rounded-2xl',
                'bg-gradient-to-br from-slate-900/95 to-slate-950/95',
                'border border-white/10 shadow-2xl',
                previewClassName
              )}
              style={{
                maxWidth,
                maxHeight,
              }}
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label={previewTitle}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className={cn(
                  'absolute top-4 right-4 z-10',
                  'p-2 rounded-full',
                  'bg-white/10 hover:bg-white/20',
                  'text-white/60 hover:text-white',
                  'transition-colors duration-200'
                )}
                aria-label="Close preview"
              >
                <X size={20} />
              </button>

              {/* Content */}
              <div className="relative">{previewContent}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

// =============================================================================
// Compact Preview Variant
// =============================================================================

export interface QuickPreviewProps {
  children: ReactNode;
  previewContent: ReactNode;
  /** Show preview on hover instead of click */
  hoverTrigger?: boolean;
  /** Delay before showing preview (ms, default: 300) */
  hoverDelay?: number;
  className?: string;
}

/**
 * Lightweight preview that shows content on hover or focus
 */
export const QuickPreview = memo(function QuickPreview({
  children,
  previewContent,
  hoverTrigger = true,
  hoverDelay = 300,
  className,
}: QuickPreviewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { allowInteraction, allowTransitions } = useMotionCapabilities();

  const showPreview = useCallback(() => {
    if (!allowInteraction) return;

    if (hoverTrigger) {
      timeoutRef.current = setTimeout(() => setIsVisible(true), hoverDelay);
    } else {
      setIsVisible(true);
    }
  }, [allowInteraction, hoverTrigger, hoverDelay]);

  const hidePreview = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={hoverTrigger ? showPreview : undefined}
      onMouseLeave={hoverTrigger ? hidePreview : undefined}
      onFocus={showPreview}
      onBlur={hidePreview}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="absolute z-40 top-full left-1/2 -translate-x-1/2 mt-2"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: allowTransitions
                ? { type: 'spring', stiffness: 400, damping: 25 }
                : { duration: 0 },
            }}
            exit={{
              opacity: 0,
              y: -5,
              scale: 0.98,
              transition: { duration: 0.15 },
            }}
          >
            <div className="relative bg-slate-900/95 rounded-xl border border-white/10 shadow-xl p-4">
              {/* Arrow */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-slate-900/95 border-l border-t border-white/10" />
              <div className="relative z-10">{previewContent}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default InteractivePreview;
