import { useCallback } from 'react';
import { User, Session, AuthError, SupabaseClient } from '@supabase/supabase-js';
import type { OAuthProvider } from './types';

interface AuthActionDeps {
  getClient: () => Promise<SupabaseClient>;
  mountedRef: React.MutableRefObject<boolean>;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: AuthError | null) => void;
  redirectTo?: string;
}

/**
 * Hook to create sign-in action
 */
export function useSignIn(deps: AuthActionDeps) {
  const { getClient, mountedRef, setUser, setSession, setIsLoading, setError } = deps;

  return useCallback(async (email: string, password: string) => {
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
  }, [getClient, mountedRef, setUser, setSession, setIsLoading, setError]);
}

/**
 * Hook to create sign-up action
 */
export function useSignUp(deps: AuthActionDeps) {
  const { getClient, mountedRef, setUser, setSession, setIsLoading, setError, redirectTo } = deps;

  return useCallback(
    async (email: string, password: string, metadata?: Record<string, unknown>) => {
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
    [getClient, mountedRef, setUser, setSession, setIsLoading, setError, redirectTo]
  );
}

/**
 * Hook to create sign-out action
 */
export function useSignOut(deps: AuthActionDeps) {
  const { getClient, mountedRef, setUser, setSession, setIsLoading, setError } = deps;

  return useCallback(async () => {
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
  }, [getClient, mountedRef, setUser, setSession, setIsLoading, setError]);
}

/**
 * Hook to create OAuth sign-in action
 */
export function useSignInWithOAuth(deps: AuthActionDeps) {
  const { getClient, mountedRef, setIsLoading, setError, redirectTo } = deps;

  return useCallback(
    async (provider: OAuthProvider) => {
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
    [getClient, mountedRef, setIsLoading, setError, redirectTo]
  );
}

/**
 * Hook to create magic link sign-in action
 */
export function useSignInWithMagicLink(deps: AuthActionDeps) {
  const { getClient, mountedRef, setIsLoading, setError, redirectTo } = deps;

  return useCallback(
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
    [getClient, mountedRef, setIsLoading, setError, redirectTo]
  );
}

/**
 * Hook to create password reset action
 */
export function useResetPassword(deps: AuthActionDeps) {
  const { getClient, mountedRef, setError, redirectTo } = deps;

  return useCallback(
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
    [getClient, mountedRef, setError, redirectTo]
  );
}

/**
 * Hook to create password update action
 */
export function useUpdatePassword(deps: Pick<AuthActionDeps, 'getClient' | 'mountedRef' | 'setError'>) {
  const { getClient, mountedRef, setError } = deps;

  return useCallback(
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
    [getClient, mountedRef, setError]
  );
}

/**
 * Hook to create profile update action
 */
export function useUpdateProfile(deps: Pick<AuthActionDeps, 'getClient' | 'mountedRef' | 'setUser' | 'setError'>) {
  const { getClient, mountedRef, setUser, setError } = deps;

  return useCallback(
    async (updates: Record<string, unknown>) => {
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
    [getClient, mountedRef, setUser, setError]
  );
}

/**
 * Hook to create session refresh action
 */
export function useRefreshSession(deps: Pick<AuthActionDeps, 'getClient' | 'mountedRef' | 'setUser' | 'setSession' | 'setError'>) {
  const { getClient, mountedRef, setUser, setSession, setError } = deps;

  return useCallback(async () => {
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
  }, [getClient, mountedRef, setUser, setSession, setError]);
}
