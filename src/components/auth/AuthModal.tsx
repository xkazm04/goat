'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';

import { SURFACE_ELEVATION, ELEVATION, INSET } from '@/components/visual/depth/depth-tokens';
import { useAuthUser } from '@/hooks/use-auth-user';
import { toast } from '@/hooks/use-toast';
import { DURATION } from '@/lib/animations/motion-presets';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Lightweight Google OAuth sign-in modal overlay.
 *
 * Centered card with backdrop -- not a full-page takeover.
 * Calls useAuthUser().signInWithGoogle() on click, shows loading state,
 * and auto-closes with a welcome toast when auth completes.
 */
export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { isAuthenticated, signInWithGoogle, isLoading } = useAuthUser();
  const wasOpenRef = useRef(false);
  const isSigningInRef = useRef(false);

  // Track when modal opens so we can detect sign-in completion
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
    }
  }, [isOpen]);

  // Auto-close + welcome toast when isAuthenticated transitions to true while modal was open
  useEffect(() => {
    if (isAuthenticated && wasOpenRef.current) {
      wasOpenRef.current = false;
      isSigningInRef.current = false;
      toast({
        title: 'Welcome! Your rankings are saved.',
        description: 'Your guest rankings have been linked to your account.',
      });
      onClose();
    }
  }, [isAuthenticated, onClose]);

  const handleSignIn = useCallback(async () => {
    isSigningInRef.current = true;
    try {
      await signInWithGoogle();
    } catch {
      isSigningInRef.current = false;
    }
  }, [signInWithGoogle]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.quick }}
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Sign in"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ duration: DURATION.quick, ease: 'easeOut' }}
            className="relative w-full max-w-sm rounded-container p-8 text-center border border-gray-700/50"
            style={{
              backgroundColor: SURFACE_ELEVATION.overlay,
              boxShadow: `${ELEVATION.modal}, ${INSET.glassHighlight}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-control text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors focus-ring-inset"
              aria-label="Close sign-in modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <h2 className="text-xl font-bold text-white mb-2">
              Sign in to G.O.A.T.
            </h2>
            <p className="text-sm text-slate-400 mb-8">
              Save your rankings and access them anywhere.
            </p>

            {/* Google sign-in button */}
            <button
              onClick={handleSignIn}
              disabled={isLoading || isSigningInRef.current}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-card bg-white text-gray-800 font-medium text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
            >
              {/* Google icon SVG */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {isSigningInRef.current ? 'Redirecting...' : 'Continue with Google'}
            </button>

            {/* Dismiss hint */}
            <p className="text-xs text-slate-500 mt-6">
              No account needed to rank. You can always sign in later.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
