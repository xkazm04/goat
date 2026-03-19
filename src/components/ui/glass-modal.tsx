'use client';

/**
 * GlassModal — Universal modal shell matching Studio design language.
 *
 * Provides consistent backdrop, surface, header, and body styling so every
 * modal in the app shares the same visual treatment (dark overlay surface,
 * amber accent highlights, depth-token shadows, glass-highlight inset).
 *
 * Usage:
 *   <GlassModal open={isOpen} onClose={close}>
 *     <GlassModalHeader icon={Settings} title="Settings" onClose={close} />
 *     <GlassModalBody>…</GlassModalBody>
 *     <GlassModalFooter hint="Some hint text" />
 *   </GlassModal>
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { type ReactNode, type ComponentType, useCallback, createContext, useContext } from 'react';

import {
  SURFACE_ELEVATION,
  ELEVATION,
  INSET,
} from '@/components/visual/depth/depth-tokens';
import { useModalAccessibility } from '@/hooks/use-modal-accessibility';
import { DURATION } from '@/lib/animations/motion-presets';
import { cn } from '@/lib/utils';

const GlassModalLabelContext = createContext<string | undefined>(undefined);

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Max-width utility class — e.g. "max-w-md", "max-w-2xl" */
  size?: string;
  /** Extra classes on the modal panel */
  className?: string;
}

export function GlassModal({
  open,
  onClose,
  children,
  size = 'sm:w-[640px]',
  className,
}: GlassModalProps) {
  const handleBackdropClick = useCallback(() => onClose(), [onClose]);
  const { modalRef, modalProps, labelId, handleKeyDown } = useModalAccessibility({
    isOpen: open,
    onClose,
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-modal bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />

          {/* Panel */}
          <motion.div
            ref={modalRef}
            {...modalProps}
            onKeyDown={handleKeyDown}
            className={cn(
              'fixed inset-4 sm:inset-auto sm:top-[10%] sm:left-1/2 sm:max-h-[75vh]',
              'z-modal sm:-translate-x-1/2 flex flex-col rounded-container',
              'border border-white/10 overflow-hidden',
              size,
              className,
            )}
            style={{
              backgroundColor: SURFACE_ELEVATION.overlay,
              boxShadow: ELEVATION.modal,
            }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: DURATION.quick }}
            onClick={(e) => e.stopPropagation()}
          >
            <GlassModalLabelContext.Provider value={labelId}>
              {children}
            </GlassModalLabelContext.Provider>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

interface GlassModalHeaderProps {
  /** Lucide icon component */
  icon?: ComponentType<{ className?: string }>;
  title: string;
  /** Optional subtitle / count */
  subtitle?: string;
  onClose: () => void;
  children?: ReactNode;
}

export function GlassModalHeader({
  icon: Icon,
  title,
  subtitle,
  onClose,
  children,
}: GlassModalHeaderProps) {
  const labelId = useContext(GlassModalLabelContext);

  return (
    <div
      className="flex items-center justify-between px-5 py-4 divider-gradient"
      style={{ boxShadow: INSET.glassHighlight }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-5 h-5 text-amber-400 shrink-0" />}
        <h2 id={labelId} className="text-base font-semibold text-white truncate">{title}</h2>
        {subtitle && (
          <span className="text-xs text-gray-500 shrink-0">{subtitle}</span>
        )}
        {children}
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-control text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

interface GlassModalBodyProps {
  children: ReactNode;
  className?: string;
  /** Disable internal scrolling (caller manages overflow) */
  noScroll?: boolean;
}

export function GlassModalBody({
  children,
  className,
  noScroll,
}: GlassModalBodyProps) {
  return (
    <div
      className={cn(
        'px-5 py-4',
        !noScroll && 'flex-1 overflow-y-auto',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

interface GlassModalFooterProps {
  /** Centered hint text */
  hint?: string;
  children?: ReactNode;
  className?: string;
}

export function GlassModalFooter({
  hint,
  children,
  className,
}: GlassModalFooterProps) {
  return (
    <div
      className={cn(
        'px-5 py-3 border-t border-white/[0.08]',
        className,
      )}
    >
      {hint && (
        <p className="text-xs text-gray-500 text-center">{hint}</p>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared form-element styles (constants for consumers)
// ---------------------------------------------------------------------------

/** Input class matching Studio form fields */
export const GLASS_INPUT_CLASS =
  'w-full px-3 py-2 rounded-control text-sm text-white placeholder-gray-500 bg-gray-900/60 border border-gray-700/50 focus:outline-none focus:border-amber-500/50 transition-colors';

/** Active pill / chip (amber highlight) */
export const GLASS_PILL_ACTIVE =
  'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40';

/** Inactive pill / chip */
export const GLASS_PILL_INACTIVE =
  'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50';

/** Section container inside modal body */
export const GLASS_SECTION_CLASS =
  'p-3 rounded-card bg-gray-900/40 border border-gray-800/50';

/** Primary action button (amber outline) */
export const GLASS_BUTTON_PRIMARY =
  'px-4 py-2.5 rounded-control text-sm font-medium bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 hover:border-amber-500/50 hover:text-amber-300 transition-all';

/** Secondary / cancel button */
export const GLASS_BUTTON_SECONDARY =
  'px-4 py-2.5 rounded-control text-sm font-medium bg-gray-800/60 border border-gray-700/50 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-all';
