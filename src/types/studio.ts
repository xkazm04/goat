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
  suggested_title: z.string().optional(),
  suggested_description: z.string().optional(),
});

/** Final item schema (with image from Wikipedia API and optional YouTube URL) */
export const enrichedItemSchema = generatedItemSchema.extend({
  image_url: z.string().nullable(),
  youtube_url: z.string().nullable().optional(),
  youtube_id: z.string().nullable().optional(),
  // Database item reference (if matched to existing item)
  db_item_id: z.string().nullable().optional(),
  db_matched: z.boolean().optional(),
  // Server already attempted Wikipedia image lookup — skip redundant client-side fetch
  server_image_attempted: z.boolean().optional(),
});

/** Response schema for /api/studio/generate */
export const generateResponseSchema = z.object({
  items: z.array(enrichedItemSchema),
  suggested_title: z.string().optional(),
  suggested_description: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────
// Inferred TypeScript Types
// ─────────────────────────────────────────────────────────────

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GeneratedItem = z.infer<typeof generatedItemSchema>;
export type EnrichedItem = z.infer<typeof enrichedItemSchema>;
export type GenerateResponse = z.infer<typeof generateResponseSchema>;

// ─────────────────────────────────────────────────────────────
// List Template Types
// ─────────────────────────────────────────────────────────────

/** A starter item seeded into a template */
export interface TemplateItem {
  title: string;
  description: string;
  wikipedia_url: string | null;
}

/** A curated list template that pre-fills the Studio form */
export interface ListTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  topic: string;
  listSize: number;
  generateCount: number;
  criteriaProfileId: string | null;
  starterItems: TemplateItem[];
  tags: string[];
  icon: string;
}

// ─────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────

export interface StudioApiError {
  error: string;
  details?: z.ZodIssue[];
  code?: string;
}
