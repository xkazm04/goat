'use client';

/**
 * LazyModals - Lazy-loaded modal wrappers for Match feature
 *
 * These components use Next.js dynamic imports to lazy-load modals only when
 * they are opened. This reduces the initial bundle size since modals are
 * conditionally rendered and don't need to be in the initial JavaScript.
 *
 * Bundle savings:
 * - ComparisonModal: ~15KB (includes FeedbackModal system)
 * - ShareModal: ~20KB (social sharing logic, activity tracking)
 */

import dynamic from 'next/dynamic';
import type { ComparisonModalProps } from '@/types/modal-props';

// Loading placeholder for modals - invisible, renders nothing
function ModalLoadingPlaceholder() {
  return null;
}

/**
 * Lazy-loaded ComparisonModal
 * Only loads when isOpen becomes true
 */
export const LazyComparisonModal = dynamic<ComparisonModalProps>(
  () => import('../ComparisonModal').then(mod => ({ default: mod.ComparisonModal })),
  {
    loading: ModalLoadingPlaceholder,
    ssr: false,
  }
);


/**
 * Lazy-loaded ShareModal
 * Only loads when isOpen becomes true
 */
interface ShareModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const LazyShareModal = dynamic<ShareModalProps>(
  () => import('../ShareModal/ShareModal').then(mod => ({ default: mod.ShareModal })),
  {
    loading: ModalLoadingPlaceholder,
    ssr: false,
  }
);
