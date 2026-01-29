/**
 * Supabase Type Aliases
 *
 * This file provides type-safe aliases for the Supabase client
 * with the Database generic properly configured.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Type-safe Supabase client with Database generic
 *
 * Use this type when accepting a Supabase client as a parameter
 * to get full type safety for database operations.
 *
 * @example
 * ```typescript
 * async function getItems(supabase: TypedSupabaseClient) {
 *   const { data } = await supabase
 *     .from('items')
 *     .select('*'); // TypeScript knows the shape of data!
 *   return data;
 * }
 * ```
 */
export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Server-side Supabase client type
 * Same as TypedSupabaseClient but semantically indicates server usage
 */
export type ServerSupabaseClient = TypedSupabaseClient;

/**
 * Browser-side Supabase client type
 * Same as TypedSupabaseClient but semantically indicates browser usage
 */
export type BrowserSupabaseClient = TypedSupabaseClient;

/**
 * Re-export Database type for convenience
 */
export type { Database };
