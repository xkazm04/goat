'use client';

import { useEffect, useRef, useCallback, useId } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseModalAccessibilityOptions {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Called when Escape is pressed */
  onClose: () => void;
  /** Custom label for aria-labelledby (uses generated id if not provided) */
  titleId?: string;
}

interface ModalAccessibilityProps {
  role: 'dialog';
  'aria-modal': true;
  'aria-labelledby': string;
}

/**
 * Hook that provides focus trapping, Escape key handling, ARIA attributes,
 * and focus restoration for modal dialogs.
 *
 * Returns a ref to attach to the modal panel and ARIA props to spread on it.
 */
export function useModalAccessibility({ isOpen, onClose, titleId }: UseModalAccessibilityOptions) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const generatedId = useId();
  const labelId = titleId || `modal-title-${generatedId}`;

  // Store the previously focused element when opening
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Focus the first interactive element when modal opens, restore on close
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Small delay to let animations render
    const raf = requestAnimationFrame(() => {
      const focusable = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        // Fallback: focus the modal itself
        modal.setAttribute('tabindex', '-1');
        modal.focus();
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      // Restore focus when unmounting / closing
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap: Tab / Shift+Tab cycling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: wrap from first → last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: wrap from last → first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  const modalProps: ModalAccessibilityProps = {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': labelId,
  };

  return {
    modalRef,
    modalProps,
    labelId,
    handleKeyDown,
  };
}
