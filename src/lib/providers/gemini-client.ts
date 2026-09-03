/**
 * Centralized Gemini AI Client & Model Configuration
 *
 * Single source of truth for the Gemini SDK client and model IDs.
 * All server-side code that calls Gemini should import from here.
 */

import { GoogleGenAI } from '@google/genai';

// ============================================================================
// Model IDs — change these when upgrading models
// ============================================================================

// 2026-09-02: BOTH ids below were shut down by the provider — `gemini-3.1-flash-lite-preview`
// and `gemini-2.0-flash` are on the "previous models / shut down" list, so every call through
// this file was failing (404 NOT_FOUND), not merely running on something stale.
//
// Both now resolve to gemini-3.8-flash, which COLLAPSES the primary/lightweight split: the 3.8
// line ships no Flash-Lite variant, so there is no cheaper sibling to point the lightweight tier
// at. The two constants are kept because callers import them separately and the split should
// return — re-split when a 3.8 (or later) Flash-Lite ships. Until then, "lightweight" tasks are
// paying the full Flash rate, and 3.8 additionally spends more reasoning/tool tokens per call
// than the 2.0 it replaces; if that matters more than correctness for the seeding/debate paths,
// the cheaper correct option is gemini-3.7-flash, not the shut-down id.

/** Primary model for structured generation with Google Search (studio, image lookup, youtube) */
export const GEMINI_MODEL_PRIMARY = 'gemini-3.8-flash';

/** Lightweight model for simple text tasks (recommendations, debate, seeding).
 *  NOTE: identical to PRIMARY today — see the shut-down note above. */
export const GEMINI_MODEL_FLASH = 'gemini-3.8-flash';

/** Model alias used by the REST-only result-image endpoint */
export const GEMINI_MODEL_REST = 'gemini-flash-latest';

// ============================================================================
// Lazy Singleton Client
// ============================================================================

let _client: GoogleGenAI | null = null;

/**
 * Get the shared Gemini AI client (lazy singleton).
 * Safe to call from any server-side context — the instance is reused across
 * requests within the same process.
 *
 * @throws Error if GEMINI_API_KEY is not set
 */
export function getGeminiClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}
