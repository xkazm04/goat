import { useState, useEffect, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import type { UseSupabaseAuthOptions, UseSupabaseAuthReturn } from './types';
import { useSupabaseClient } from './client';
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
  const { redirectTo, onAuthStateChange, autoRefresh = true } = options;

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);

  const mountedRef = useRef(true);
  const { getClient } = useSupabaseClient(autoRefresh);

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
   * Initialize auth state and setup listener
   */
  useEffect(() => {
    let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const initAuth = async () => {
      try {
        const client = await getClient();

        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await client.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (mountedRef.current) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setIsLoading(false);
        }

        // Setup auth state change listener
        authListener = client.auth.onAuthStateChange(async (event, newSession) => {
          if (!mountedRef.current) return;

          console.log('Auth state changed:', event);

          setSession(newSession);
          setUser(newSession?.user ?? null);
          setIsLoading(false);

          // Call custom callback if provided
          if (onAuthStateChange) {
            onAuthStateChange(event, newSession);
          }
        });
      } catch (err) {
        if (mountedRef.current) {
          setError(err as AuthError);
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mountedRef.current = false;
      if (authListener) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, [getClient, onAuthStateChange]);

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
