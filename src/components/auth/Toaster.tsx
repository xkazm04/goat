'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DURATION } from '@/lib/animations/motion-presets';

/**
 * Toast renderer -- renders toast notifications from the use-toast.ts store.
 *
 * Place once at the root layout. Toasts appear at the bottom-right.
 */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-toast flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts
          .filter((t) => t.open)
          .map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: { id: string; title?: React.ReactNode; description?: React.ReactNode };
  onDismiss: () => void;
}) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: DURATION.fast, ease: 'easeOut' }}
      className="pointer-events-auto w-80 rounded-container px-4 py-3 shadow-2xl"
      style={{
        background: 'rgba(15, 23, 42, 0.97)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        boxShadow:
          '0 12px 40px -8px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 185, 129, 0.1)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-sm font-medium text-white">{toast.title}</p>
          )}
          {toast.description && (
            <p className="text-xs text-slate-400 mt-0.5">{toast.description}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-control text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
