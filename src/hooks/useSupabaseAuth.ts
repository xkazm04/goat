/**
 * Supabase Auth Hook
 *
 * This module has been refactored into smaller, focused files:
 * - ./supabase-auth/types.ts - Type definitions
 * - ./supabase-auth/client.ts - Supabase client initialization
 * - ./supabase-auth/actions.ts - Authentication action hooks
 * - ./supabase-auth/index.ts - Main hook composition
 *
 * This file re-exports everything for backwards compatibility.
 */
export {
  useSupabaseAuth,
  useSupabaseUser,
  useSupabaseUserRole,
  type AuthState,
  type AuthActions,
  type UseSupabaseAuthReturn,
  type UseSupabaseAuthOptions,
  type OAuthProvider,
} from './supabase-auth';
