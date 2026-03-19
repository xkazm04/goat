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

/** Primary model for structured generation with Google Search (studio, image lookup, youtube) */
export const GEMINI_MODEL_PRIMARY = 'gemini-3-flash-preview';

/** Lightweight model for simple text tasks (recommendations, debate, seeding) */
export const GEMINI_MODEL_FLASH = 'gemini-2.0-flash';

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
