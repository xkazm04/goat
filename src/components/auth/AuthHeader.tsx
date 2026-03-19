'use client';

import { useState, useCallback } from 'react';
import { LogIn } from 'lucide-react';
import { useAuthUser } from '@/hooks/use-auth-user';
import { AuthModal } from './AuthModal';
import { UserMenu } from './UserMenu';

/**
 * Auth state indicator for the app header.
 *
 * - Guest: shows "Sign in" button that opens AuthModal
 * - Authenticated: shows UserMenu (avatar + dropdown)
 * - Loading: renders nothing (avoids flash)
 */
export function AuthHeader() {
  const { isAuthenticated, isGuest, isLoading } = useAuthUser();
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // Don't render anything while auth state is loading to avoid flash
  if (isLoading) return null;

  return (
    <div data-testid="auth-header">
      {isAuthenticated ? (
        <UserMenu />
      ) : isGuest ? (
        <button
          onClick={handleOpenModal}
          data-testid="auth-sign-in-btn"
          className="flex items-center gap-2 px-3 py-1.5 rounded-card text-sm font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 focus-ring-inset"
        >
          <LogIn className="w-4 h-4" />
          Sign in
        </button>
      ) : null}

      <AuthModal isOpen={showModal} onClose={handleCloseModal} />
    </div>
  );
}
