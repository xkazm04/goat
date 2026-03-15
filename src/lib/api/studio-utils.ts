/**
 * Studio API Utilities
 * Shared utilities for Studio API routes including:
 * - Lazy singleton client factories (Gemini, Supabase)
 * - Standardized error handling and response formatting
 * - Zod validation error handling
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { StudioApiError } from '@/types/studio';

// ============================================================================
// Client Factories (Lazy Singletons)
// ============================================================================

let geminiClient: GoogleGenAI | null = null;
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Gemini AI client (lazy singleton)
 * @throws Error if GEMINI_API_KEY is not configured
 */
export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new StudioConfigError('GEMINI_API_KEY not configured');
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

/**
 * Get or create Supabase client (lazy singleton)
 * Uses service role key for server-side operations
 * @throws Error if Supabase credentials are not configured
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new StudioConfigError('Supabase credentials not configured');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Configuration error (missing API keys, etc.)
 */
export class StudioConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudioConfigError';
  }
}

/**
 * Validation error (Zod parsing failed)
 */
export class StudioValidationError extends Error {
  public readonly issues: z.ZodIssue[];

  constructor(zodError: z.ZodError) {
    super('Validation failed');
    this.name = 'StudioValidationError';
    this.issues = zodError.issues;
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Standard error codes for Studio API
 */
export const StudioErrorCodes = {
  CONFIG_ERROR: 'CONFIG_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  GENERATION_ERROR: 'GENERATION_ERROR',
  YOUTUBE_SEARCH_ERROR: 'YOUTUBE_SEARCH_ERROR',
  MATCH_ERROR: 'MATCH_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type StudioErrorCode = typeof StudioErrorCodes[keyof typeof StudioErrorCodes];

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number,
  options?: { details?: z.ZodIssue[]; code?: StudioErrorCode }
): NextResponse<StudioApiError> {
  const errorResponse: StudioApiError = {
    error,
    ...(options?.details && { details: options.details }),
    ...(options?.code && { code: options.code }),
  };
  return NextResponse.json(errorResponse, { status });
}

/**
 * Handle errors in a standardized way
 * Returns appropriate NextResponse based on error type
 */
export function handleStudioError(
  error: unknown,
  context: string,
  defaultCode: StudioErrorCode = StudioErrorCodes.UNKNOWN_ERROR
): NextResponse<StudioApiError> {
  // Zod validation errors -> 400
  if (error instanceof z.ZodError) {
    return createErrorResponse('Invalid request', 400, {
      details: error.issues,
      code: StudioErrorCodes.VALIDATION_ERROR,
    });
  }

  // Configuration errors -> 500
  if (error instanceof StudioConfigError) {
    return createErrorResponse(error.message, 500, {
      code: StudioErrorCodes.CONFIG_ERROR,
    });
  }

  // Standard errors -> 500
  if (error instanceof Error) {
    console.error(`${context}:`, error);
    return createErrorResponse(error.message, 500, { code: defaultCode });
  }

  // Unknown errors -> 500
  console.error(`${context}:`, error);
  return createErrorResponse(`${context} failed`, 500, { code: defaultCode });
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create a successful JSON response
 */
export function createSuccessResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

// ============================================================================
// Request Helpers
// ============================================================================

/**
 * Parse and validate request body with a Zod schema
 * @throws z.ZodError if validation fails
 */
export async function parseRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Safely parse request body, returning either data or a validation error response
 */
export async function safeParseRequest<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse<StudioApiError> }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        response: createErrorResponse('Invalid request', 400, {
          details: result.error.issues,
          code: StudioErrorCodes.VALIDATION_ERROR,
        }),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      response: createErrorResponse('Invalid JSON body', 400, {
        code: StudioErrorCodes.VALIDATION_ERROR,
      }),
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract title from Wikipedia URL
 */
export function extractWikiTitle(url: string): string | null {
  if (!url) return null;
  try {
    const match = url.match(/wikipedia\.org\/wiki\/(.+?)(?:#|$|\?)/);
    if (match) {
      return decodeURIComponent(match[1].replace(/_/g, ' '));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate variations of a title to try for Wikipedia lookup
 */
export function generateTitleVariations(title: string): string[] {
  const variations: string[] = [];
  const clean = title.trim();

  // Add "The" prefix if not present
  if (!clean.toLowerCase().startsWith('the ')) {
    variations.push(`The ${clean}`);
  }

  // Remove "The" prefix if present
  if (clean.toLowerCase().startsWith('the ')) {
    variations.push(clean.substring(4));
  }

  // Remove common suffixes/parentheticals
  const withoutParens = clean.replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (withoutParens !== clean) {
    variations.push(withoutParens);
  }

  // Remove year from title (e.g., "Movie (2023)" -> "Movie")
  const withoutYear = clean.replace(/\s*\(\d{4}\)\s*/g, '').trim();
  if (withoutYear !== clean) {
    variations.push(withoutYear);
  }

  return variations;
}

/**
 * Extract year hint from title if present (e.g., "Movie (2023)" -> { year: 2023 })
 */
export function extractYearFromTitle(title: string): { year?: number } | undefined {
  const yearMatch = title.match(/\((\d{4})\)/);
  if (yearMatch) {
    return { year: parseInt(yearMatch[1], 10) };
  }
  return undefined;
}
