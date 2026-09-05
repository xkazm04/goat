import { User, Session, AuthError } from '@supabase/supabase-js';
import { useState, useEffect, useRef } from 'react';

import {
  useSignIn,
  useSignUp,
  useSignOut,
  useSignInWithOAuth,
  useSignInWithMagicLink,
  useResetPassword,
  useUpdatePassword,
  useUpdateProfile,
  useRefreshSession,
} from './actions';
import { useSupabaseClient } from './client';

import type { UseSupabaseAuthOptions, UseSupabaseAuthReturn } from './types';


// Re-export types
export * from './types';

/**
 * Custom hook to manage authentication state using Supabase's built-in auth methods
 * Provides sign in, sign up, sign out, and session management
 *
 * @example
 * ```tsx
 * const {
 *   user,
 *   session,
 *   isLoading,
 *   isAuthenticated,
 *   signIn,
 *   signOut,
 *   signUp
 * } = useSupabaseAuth();
 *
 * // Sign in
 * await signIn('user@example.com', 'password');
 *
 * // Sign out
 * await signOut();
 *
 * // Check authentication
 * if (isAuthenticated) {
 *   console.log('User is logged in:', user.email);
 * }
 * ```
 */
export function useSupabaseAuth(options: UseSupabaseAuthOptions = {}): UseSupabaseAuthReturn {
  const { redirectTo, onAuthStateChange } = options;

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);

  const mountedRef = useRef(true);
  const { getClient } = useSupabaseClient();

  // The caller's callback is LATCHED, not depended on. Callers pass it inline,
  // so its identity changes on every one of their renders; making it an effect
  // dependency turned each render into an unsubscribe/resubscribe (measured: 4
  // subscriptions across mount + 2 re-renders) and, because the teardown also
  // flipped `mountedRef` off with nothing to flip it back, froze the hook on its
  // last-seen state. Registry: client-state / effect-identity-and-latched-callbacks.
  const onAuthStateChangeRef = useRef(onAuthStateChange);
  useEffect(() => {
    onAuthStateChangeRef.current = onAuthStateChange;
  }, [onAuthStateChange]);

  // Action dependencies
  const actionDeps = {
    getClient,
    mountedRef,
    setUser,
    setSession,
    setIsLoading,
    setError,
    redirectTo,
  };

  // Create actions
  const signIn = useSignIn(actionDeps);
  const signUp = useSignUp(actionDeps);
  const signOut = useSignOut(actionDeps);
  const signInWithOAuth = useSignInWithOAuth(actionDeps);
  const signInWithMagicLink = useSignInWithMagicLink(actionDeps);
  const resetPassword = useResetPassword(actionDeps);
  const updatePassword = useUpdatePassword(actionDeps);
  const updateProfile = useUpdateProfile(actionDeps);
  const refreshSession = useRefreshSession(actionDeps);

  /**
   * Initialize auth state and setup listener.
   *
   * ONE session per client: the dependency list names the client and nothing
   * else. The listener is registered BEFORE the initial getSession() resolves
   * so an event that lands during that await is not lost, and every write is
   * guarded by a session-local `cancelled` flag as well as `mountedRef`, so a
   * torn-down session's late completion writes nothing.
   */
  useEffect(() => {
    // Re-arm on every (re)start: the previous teardown disarmed it.
    mountedRef.current = true;
    let cancelled = false;
    let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const live = () => mountedRef.current && !cancelled;

    const initAuth = async () => {
      try {
        const client = await getClient();
        if (!live()) return;

        // Subscribe first, then read: the listener sees anything that happens
        // while getSession() is in flight.
        authListener = client.auth.onAuthStateChange((event, newSession) => {
          if (!live()) return;

          setSession(newSession);
          setUser(newSession?.user ?? null);
          setIsLoading(false);

          // Read at CALL time, never at session start — a caller's newest
          // callback must see the event without restarting the session.
          onAuthStateChangeRef.current?.(event, newSession);
        });

        const { data: { session: initialSession }, error: sessionError } = await client.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (live()) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setIsLoading(false);
        }
      } catch (err) {
        if (live()) {
          setError(err as AuthError);
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (authListener) {
        authListener.data.subscription.unsubscribe();
        authListener = null;
      }
    };
  }, [getClient]);

  return {
    // State
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    error,
    // Actions
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    signInWithMagicLink,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshSession,
  };
}

/**
 * Helper hook to get the current user (simpler API)
 */
export function useSupabaseUser() {
  const { user, isLoading, isAuthenticated } = useSupabaseAuth();
  return { user, isLoading, isAuthenticated };
}

/**
 * Helper hook to check if user has specific role/permission
 */
export function useSupabaseUserRole(requiredRole?: string) {
  const { user, isLoading, isAuthenticated } = useSupabaseAuth();

  const hasRole = user?.user_metadata?.role === requiredRole;
  const canAccess = !requiredRole || hasRole;

  return {
    user,
    isLoading,
    isAuthenticated,
    hasRole,
    canAccess,
    role: user?.user_metadata?.role,
  };
}
