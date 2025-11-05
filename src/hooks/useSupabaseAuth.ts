import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
}

/**
 * Authentication actions interface
 */
export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github' | 'facebook' | 'twitter') => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (updates: Record<string, any>) => Promise<User | null>;
  refreshSession: () => Promise<Session | null>;
}

/**
 * Complete authentication hook return type
 */
export type UseSupabaseAuthReturn = AuthState & AuthActions;

/**
 * Options for useSupabaseAuth hook
 */
export interface UseSupabaseAuthOptions {
  redirectTo?: string;
  onAuthStateChange?: (event: AuthChangeEvent, session: Session | null) => void;
  autoRefresh?: boolean;
}

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

  const clientRef = useRef<SupabaseClient | null>(null);
  const mountedRef = useRef(true);

  /**
   * Initialize Supabase client
   */
  const getClient = useCallback(async (): Promise<SupabaseClient> => {
    if (clientRef.current) {
      return clientRef.current;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing. Please check your environment variables.');
    }

    clientRef.current = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: autoRefresh,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

    return clientRef.current;
  }, [autoRefresh]);

  /**
   * Initialize auth state and setup listener
   */
  useEffect(() => {
    let authListener: { data: { subscription: any } } | null = null;

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

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const client = await getClient();
      const { data, error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (mountedRef.current) {
        setUser(data.user);
        setSession(data.session);
        setIsLoading(false);
      }

      return { user: data.user, session: data.session };
    } catch (err) {
      const authError = err as AuthError;
      if (mountedRef.current) {
        setError(authError);
        setIsLoading(false);
      }
      throw authError;
    }
  }, [getClient]);

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(
    async (email: string, password: string, metadata?: Record<string, any>) => {
      setIsLoading(true);
      setError(null);

      try {
        const client = await getClient();
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: redirectTo,
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (mountedRef.current) {
          setUser(data.user);
          setSession(data.session);
          setIsLoading(false);
        }

        return { user: data.user, session: data.session };
      } catch (err) {
        const authError = err as AuthError;
        if (mountedRef.current) {
          setError(authError);
          setIsLoading(false);
        }
        throw authError;
      }
    },
    [getClient, redirectTo]
  );

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = await getClient();
      const { error: signOutError } = await client.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      if (mountedRef.current) {
        setUser(null);
        setSession(null);
        setIsLoading(false);
      }
    } catch (err) {
      const authError = err as AuthError;
      if (mountedRef.current) {
        setError(authError);
        setIsLoading(false);
      }
      throw authError;
    }
  }, [getClient]);

  /**
   * Sign in with OAuth provider
   */
  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'github' | 'facebook' | 'twitter') => {
      setIsLoading(true);
      setError(null);

      try {
        const client = await getClient();
        const { error: oauthError } = await client.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
          },
        });

        if (oauthError) {
          throw oauthError;
        }
      } catch (err) {
        const authError = err as AuthError;
        if (mountedRef.current) {
          setError(authError);
          setIsLoading(false);
        }
        throw authError;
      }
    },
    [getClient, redirectTo]
  );

  /**
   * Sign in with magic link (passwordless)
   */
  const signInWithMagicLink = useCallback(
    async (email: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const client = await getClient();
        const { error: magicLinkError } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (magicLinkError) {
          throw magicLinkError;
        }

        if (mountedRef.current) {
          setIsLoading(false);
        }
      } catch (err) {
        const authError = err as AuthError;
        if (mountedRef.current) {
          setError(authError);
          setIsLoading(false);
        }
        throw authError;
      }
    },
    [getClient, redirectTo]
  );

  /**
   * Send password reset email
   */
  const resetPassword = useCallback(
    async (email: string) => {
      setError(null);

      try {
        const client = await getClient();
        const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (resetError) {
          throw resetError;
        }
      } catch (err) {
        const authError = err as AuthError;
        if (mountedRef.current) {
          setError(authError);
        }
        throw authError;
      }
    },
    [getClient, redirectTo]
  );

  /**
   * Update user password
   */
  const updatePassword = useCallback(
    async (newPassword: string) => {
      setError(null);

      try {
        const client = await getClient();
        const { error: updateError } = await client.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          throw updateError;
        }
      } catch (err) {
        const authError = err as AuthError;
        if (mountedRef.current) {
          setError(authError);
        }
        throw authError;
      }
    },
    [getClient]
  );

  /**
   * Update user profile metadata
   */
  const updateProfile = useCallback(
    async (updates: Record<string, any>) => {
      setError(null);

      try {
        const client = await getClient();
        const { data, error: updateError } = await client.auth.updateUser({
          data: updates,
        });

        if (updateError) {
          throw updateError;
        }

        if (mountedRef.current && data.user) {
          setUser(data.user);
        }

        return data.user;
      } catch (err) {
        const authError = err as AuthError;
        if (mountedRef.current) {
          setError(authError);
        }
        throw authError;
      }
    },
    [getClient]
  );

  /**
   * Manually refresh the session
   */
  const refreshSession = useCallback(async () => {
    setError(null);

    try {
      const client = await getClient();
      const { data, error: refreshError } = await client.auth.refreshSession();

      if (refreshError) {
        throw refreshError;
      }

      if (mountedRef.current) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }

      return data.session;
    } catch (err) {
      const authError = err as AuthError;
      if (mountedRef.current) {
        setError(authError);
      }
      throw authError;
    }
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
