/**
 * Composition result type.
 *
 * This module was a migration shim: it re-exported ten symbols from
 * `./list-intent` and `./list-intent-transformers` under legacy aliases so
 * call sites could move over gradually. That move finished — every consumer
 * now imports those symbols from their own modules, and a grep for each
 * re-exported name found zero importers reaching them through here. The
 * aliases were removed on 2026-09-05; the only thing this module still owns is
 * `CompositionResult`, which is declared here and nowhere else.
 *
 * Import ListIntent types from `@/types/list-intent` and the transformers from
 * `@/types/list-intent-transformers` directly.
 */

/**
 * Result of a composition operation
 */
export interface CompositionResult {
  success: boolean;
  listId?: string;
  message: string;
  redirectUrl?: string;
  error?: string;
}