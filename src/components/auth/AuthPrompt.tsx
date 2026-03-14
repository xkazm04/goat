'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { AuthModal } from './AuthModal';

const DISMISSED_KEY = 'goat-auth-prompt-dismissed';

interface AuthPromptProps {
  /** Optional callback when prompt is dismissed */
  onDismiss?: () => void;
}

/**
 * Post-completion dismissible sign-up nudge for guest users.
 *
 * Shown after first completed ranking. "Continue with Google" opens AuthModal.
 * "Not now" dismisses and stores flag in localStorage so it doesn't re-appear
 * in the same session.
 */
export function AuthPrompt({ onDismiss }: AuthPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check localStorage on mount -- don't show if already dismissed this session
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(DISMISSED_KEY);
      if (!dismissed) {
        setIsVisible(true);
      }
    } catch {
      // sessionStorage unavailable (SSR/privacy mode) -- show anyway
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
    onDismiss?.();
  }, [onDismiss]);

  const handleOpenAuth = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleCloseAuth = useCallback(() => {
    setShowAuthModal(false);
    // If user signed in, the AuthModal will handle toast + close
    // Dismiss the prompt regardless
    handleDismiss();
  }, [handleDismiss]);

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative rounded-xl p-4 mt-4 flex items-center gap-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <div className="shrink-0 p-2 rounded-lg bg-emerald-500/10">
              <UserPlus className="w-5 h-5 text-emerald-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                Sign up to save this to your profile
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Keep your rankings and access them from any device.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOpenAuth}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Continue with Google
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-400"
                aria-label="Dismiss sign-up prompt"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={showAuthModal} onClose={handleCloseAuth} />
    </>
  );
}
