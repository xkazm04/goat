'use client';

/**
 * LazyCompositionModal - Lazy-loaded wrapper for CompositionModal
 *
 * This component uses Next.js dynamic imports to lazy-load the CompositionModal
 * only when it's opened. The modal includes complex form components, template
 * galleries, and blueprint logic that aren't needed on initial page load.
 *
 * Bundle savings: ~25KB (includes template system, blueprint logic, form components)
 */

import dynamic from 'next/dynamic';
import type { CompositionResult } from '@/types/composition-to-api';

interface CompositionModalProps {
  initialAuthor?: string;
  initialComment?: string;
  onSuccess?: (result: CompositionResult) => void;
}

// Loading placeholder - renders nothing since modal starts closed
function ModalLoadingPlaceholder() {
  return null;
}

/**
 * Lazy-loaded CompositionModal
 * Only loads when the modal is opened via composition store
 */
export const LazyCompositionModal = dynamic<CompositionModalProps>(
  () => import('./CompositionModal').then(mod => ({ default: mod.CompositionModal })),
  {
    loading: ModalLoadingPlaceholder,
    ssr: false,
  }
);

// Default export for simpler imports
export default LazyCompositionModal;
