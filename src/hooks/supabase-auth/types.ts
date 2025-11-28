import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js';

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
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github' | 'facebook' | 'twitter') => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (updates: Record<string, unknown>) => Promise<User | null>;
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
 * OAuth provider types
 */
export type OAuthProvider = 'google' | 'github' | 'facebook' | 'twitter';
