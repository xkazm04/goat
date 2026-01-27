/**
 * Studio List Creation Types
 *
 * Types for AI-powered list generation in the Studio feature.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Request/Response Schemas (used for validation AND types)
// ─────────────────────────────────────────────────────────────

/** Request schema for /api/studio/generate */
export const generateRequestSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic too long'),
  count: z.number().int().min(1).max(100).default(10),
  category: z.string().optional(),
  excludeTitles: z.array(z.string()).optional(),
});

/** Individual item schema from Gemini response */
export const generatedItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  wikipedia_url: z.string().nullable(),
});

/** Gemini API response schema (before image enrichment) */
export const geminiResponseSchema = z.object({
  items: z.array(generatedItemSchema),
});

/** Final item schema (with image from Wikipedia API and optional YouTube URL) */
export const enrichedItemSchema = generatedItemSchema.extend({
  image_url: z.string().nullable(),
  youtube_url: z.string().nullable().optional(),
  youtube_id: z.string().nullable().optional(),
  // Database item reference (if matched to existing item)
  db_item_id: z.string().nullable().optional(),
  db_matched: z.boolean().optional(),
});

/** Response schema for /api/studio/generate */
export const generateResponseSchema = z.object({
  items: z.array(enrichedItemSchema),
});

// ─────────────────────────────────────────────────────────────
// Inferred TypeScript Types
// ─────────────────────────────────────────────────────────────

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GeneratedItem = z.infer<typeof generatedItemSchema>;
export type EnrichedItem = z.infer<typeof enrichedItemSchema>;
export type GenerateResponse = z.infer<typeof generateResponseSchema>;

// ─────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────

export interface StudioApiError {
  error: string;
  details?: z.ZodIssue[];
  code?: string;
}
