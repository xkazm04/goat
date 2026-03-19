'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useSupabaseAuth } from '@/hooks/supabase-auth';
import { useTempUser } from '@/hooks/use-temp-user';

/**
 * Unified auth hook -- the single source of truth for user identity.
 *
 * Returns a userId for BOTH guests and authenticated users:
 * - Authenticated: Supabase user.id
 * - Guest: localStorage UUID from useTempUser()
 *
 * On SIGNED_IN, automatically merges guest data to the new user account
 * by calling /api/auth/merge-guest, then upgrades localStorage identity.
 *
 * This hook is Supabase-aware by design (no provider abstraction layer).
 */
export function useAuthUser() {
  const {
    user,
    session,
    isLoading: authLoading,
    signInWithOAuth,
    signOut: supabaseSignOut,
  } = useSupabaseAuth();

  const {
    tempUserId,
    isLoaded: guestLoaded,
    isTempUser,
    migrateTempUserToReal: upgradeToRegisteredUser,
  } = useTempUser();

  // Track whether we've already run the merge for this session
  const hasMergedRef = useRef(false);

  // Effective user ID: Supabase user if authenticated, guest UUID otherwise
  const userId = user?.id ?? tempUserId;
  const isAuthenticated = !!user && !!session;
  const isGuest = !isAuthenticated && !!tempUserId;

  // Handle guest-to-user merge on sign-in
  useEffect(() => {
    if (!user || !session || hasMergedRef.current) return;
    if (!tempUserId || !isTempUser) return;

    // The guest had a different UUID -- merge their data
    if (tempUserId !== user.id) {
      hasMergedRef.current = true;

      const mergeGuestData = async () => {
        try {
          await fetch('/api/auth/merge-guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_id: tempUserId }),
          });
        } catch (err) {
          console.error('Failed to merge guest data:', err);
        }

        // Upgrade localStorage identity regardless of merge result
        // so the user doesn't get stuck with guest UUID
        upgradeToRegisteredUser(user.id);
      };

      mergeGuestData();
    }
  }, [user, session, tempUserId, isTempUser, upgradeToRegisteredUser]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithOAuth('google');
  }, [signInWithOAuth]);

  const handleSignOut = useCallback(async () => {
    hasMergedRef.current = false;
    await supabaseSignOut();
    // Rankings stay in localStorage -- user becomes guest again
  }, [supabaseSignOut]);

  return {
    /** Always available: Supabase user ID when authenticated, guest UUID otherwise */
    userId,
    /** Supabase User object, null for guests */
    user,
    /** Supabase Session object, null for guests */
    session,
    /** True when Supabase session is active */
    isAuthenticated,
    /** True when user has no Supabase session (using guest UUID) */
    isGuest,
    /** True while auth state is being determined */
    isLoading: authLoading || !guestLoaded,
    /** Trigger Google OAuth sign-in flow */
    signInWithGoogle,
    /** Sign out -- returns user to guest mode */
    signOut: handleSignOut,
  };
}
