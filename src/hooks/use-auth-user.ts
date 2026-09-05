'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useSupabaseAuth } from '@/hooks/supabase-auth';
import { useTempUser } from '@/hooks/use-temp-user';
import { emitErrorNotification } from '@/lib/errors/error-notification-store';

/** Shape of `/api/auth/merge-guest`'s 200 body — partial failure lives INSIDE it. */
interface MergeGuestResponse {
  merged?: boolean;
  skipped?: boolean;
  results?: Record<string, { updated: boolean; error?: string }>;
}

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
        // The route reports per-table outcome in its 200 body and only uses a
        // non-2xx status for "could not start". Reading the status alone
        // treated "moved 0 of 3 tables" as success and then upgraded the local
        // identity over orphaned guest rows without a word. Losing the merge
        // must never mean losing the failure.
        try {
          const res = await fetch('/api/auth/merge-guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_id: tempUserId }),
          });
          const body = (await res.json().catch(() => null)) as MergeGuestResponse | null;
          const failedTables = Object.entries(body?.results ?? {})
            .filter(([, outcome]) => outcome?.updated === false)
            .map(([table]) => table);

          if (!res.ok || failedTables.length > 0) {
            const reason = !res.ok
              ? `HTTP ${res.status}`
              : `not moved: ${failedTables.join(', ')}`;
            console.error('Guest data merge incomplete:', {
              status: res.status,
              failedTables,
              guestId: tempUserId,
              userId: user.id,
            });
            emitErrorNotification(new Error(`Guest data merge incomplete (${reason})`), {
              source: 'guest-merge',
            });
          }
        } catch (err) {
          console.error('Failed to merge guest data:', err);
          emitErrorNotification(err, { source: 'guest-merge' });
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
