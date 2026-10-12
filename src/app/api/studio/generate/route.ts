/**
 * POST /api/studio/generate
 *
 * AI-powered list item generation endpoint using Google Gemini.
 * Generates items for a topic with titles, descriptions, and Wikipedia URLs,
 * then enriches with images from multiple sources via the enrichment pipeline.
 *
 * Supports two modes:
 * - Default (JSON): Returns all items at once (backward compatible)
 * - Streaming (?stream=true): Returns NDJSON with progressive items
 *
 * NEW: Searches Supabase database for existing items by title to reuse
 * images and IDs, reducing duplicate items and improving consistency.
 */

import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, getRateLimitKey } from '@/lib/api/rate-limiter';
import {
  handleStudioError,
  extractWikiTitle,
  generateTitleVariations,
  extractYearFromTitle,
  StudioErrorCodes,
} from '@/lib/api/studio-utils';
import { fetchWikipediaImage } from '@/lib/api/wiki-images';
import { EnrichmentPipeline } from '@/lib/enrichment';
import { getGeminiClient, GEMINI_MODEL_PRIMARY } from '@/lib/providers/gemini-client';
import { createClient } from '@/lib/supabase/server';
import {
  generateRequestSchema,
  geminiResponseSchema,
} from '@/types/studio';

import type { GeneratedItem } from '@/types/studio';

export const dynamic = 'force-dynamic';

/**
 * Explicit JSON Schema for Gemini structured output.
 * zodToJsonSchema v3.25+ returns empty schemas for Zod objects — this is the manual equivalent.
 */
const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          wikipedia_url: { type: 'string', nullable: true },
        },
        required: ['title', 'description', 'wikipedia_url'],
      },
    },
    suggested_title: { type: 'string' },
    suggested_description: { type: 'string' },
  },
  required: ['items'],
} as const;
export const maxDuration = 60;

/** Run async tasks with bounded concurrency */
async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}

/**
 * Search Supabase for existing items matching the given titles
 * Returns a map of lowercase title -> item data
 */
async function findExistingItems(
  titles: string[],
  category?: string,
  _requestId?: string
): Promise<Map<string, { id: string; name: string; image_url: string | null }>> {
  const resultMap = new Map<string, { id: string; name: string; image_url: string | null }>();

  if (titles.length === 0) return resultMap;

  try {
    const supabase = await createClient();

    // Build a query to find items matching any of the titles
    // Use ilike for case-insensitive matching
    let query = supabase
      .from('items')
      .select('id, name, image_url, category')
      .limit(titles.length * 2); // Allow for some duplicates

    // Build OR conditions for all titles
    // Wrap values in double quotes to escape PostgREST special characters (commas, dots, parens, colons)
    const orConditions = titles
      .map(title => {
        const escaped = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `name.ilike."${escaped}"`;
      })
      .join(',');
    query = query.or(orConditions);

    // Optionally filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return resultMap;
    }

    // Map results by lowercase title for easy lookup
    if (data) {
      for (const item of data) {
        const normalizedName = item.name.toLowerCase().trim();
        // Prefer items with images
        if (!resultMap.has(normalizedName) || (item.image_url && !resultMap.get(normalizedName)?.image_url)) {
          resultMap.set(normalizedName, {
            id: item.id,
            name: item.name,
            image_url: item.image_url,
          });
        }
      }
    }

    return resultMap;
  } catch {
    return resultMap;
  }
}

/** Enrichment source tracking for summary logging */
type EnrichmentSource = 'database' | 'enrichment_pipeline' | 'wiki_fallback' | 'none';

/**
 * Enrich a single item with images from DB, enrichment pipeline, or Wikipedia.
 * Returns the enriched item plus an `enrichment_source` indicating how the image was resolved.
 */
async function enrichItem(
  item: GeneratedItem,
  existingItems: Map<string, { id: string; name: string; image_url: string | null }>,
  category?: string,
  useEnrichmentPipeline = false,
  _requestId?: string
): Promise<Record<string, unknown> & { enrichment_source: EnrichmentSource; enrich_duration_ms: number }> {
  const enrichStart = performance.now();

  // Check if item exists in database first
  const normalizedTitle = item.title.toLowerCase().trim();
  const existingItem = existingItems.get(normalizedTitle);

  if (existingItem) {
    return {
      ...item,
      image_url: existingItem.image_url,
      db_matched: true,
      db_item_id: existingItem.id,
      server_image_attempted: true,
      enrichment_source: 'database' as const,
      enrich_duration_ms: Math.round(performance.now() - enrichStart),
    };
  }

  // If enrichment pipeline is enabled, use it for better image quality
  if (useEnrichmentPipeline && category) {
    try {
      const enrichResult = await EnrichmentPipeline.enrich({
        name: item.title,
        category: category,
        hints: extractYearFromTitle(item.title),
      });

      if (enrichResult.success && enrichResult.data?.selectedImage?.url) {
        return {
          ...item,
          image_url: enrichResult.data.selectedImage.url,
          db_matched: false,
          server_image_attempted: true,
          enriched_data: {
            description: enrichResult.data.description || item.description,
            year: enrichResult.data.year,
            rating: enrichResult.data.rating,
            genres: enrichResult.data.genres,
            sources: enrichResult.data.sources,
          },
          enrichment_source: 'enrichment_pipeline' as const,
          enrich_duration_ms: Math.round(performance.now() - enrichStart),
        };
      }
    } catch {
      // Enrichment pipeline failed — falling back to other sources
    }
  }

  // Fallback: Wikipedia-only image lookup

  // Strategy 1: Try direct Wikipedia lookup with exact title
  let wikiImage = await fetchWikipediaImage(item.title);
  if (wikiImage?.url) {
    return { ...item, image_url: wikiImage.url, db_matched: false, server_image_attempted: true, enrichment_source: 'wiki_fallback' as const, enrich_duration_ms: Math.round(performance.now() - enrichStart) };
  }

  // Strategy 2: Extract title from Wikipedia URL if provided
  if (item.wikipedia_url) {
    const wikiTitle = extractWikiTitle(item.wikipedia_url);
    if (wikiTitle && wikiTitle !== item.title) {
      wikiImage = await fetchWikipediaImage(wikiTitle);
      if (wikiImage?.url) {
        return { ...item, image_url: wikiImage.url, db_matched: false, server_image_attempted: true, enrichment_source: 'wiki_fallback' as const, enrich_duration_ms: Math.round(performance.now() - enrichStart) };
      }
    }
  }

  // Strategy 3: Try common title variations
  const variations = generateTitleVariations(item.title);
  for (const variation of variations.slice(0, 3)) {
    wikiImage = await fetchWikipediaImage(variation);
    if (wikiImage?.url) {
      return { ...item, image_url: wikiImage.url, db_matched: false, server_image_attempted: true, enrichment_source: 'wiki_fallback' as const, enrich_duration_ms: Math.round(performance.now() - enrichStart) };
    }
  }

  const totalMs = Math.round(performance.now() - enrichStart);
  return { ...item, image_url: null, db_matched: false, server_image_attempted: true, enrichment_source: 'none' as const, enrich_duration_ms: totalMs };
}

/**
 * Call Gemini with one silent retry on failure.
 * Returns the parsed result and the number of retries that occurred.
 */
async function callGeminiWithRetry(
  ai: ReturnType<typeof getGeminiClient>,
  prompt: string,
  jsonSchema: Record<string, unknown>,
  _requestId?: string
) {
  let lastError: Error | null = null;
  const callStart = performance.now();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL_PRIMARY,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseJsonSchema: jsonSchema,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      const parsed = geminiResponseSchema.parse(JSON.parse(responseText));
      const totalMs = Math.round(performance.now() - callStart);

      return {
        result: parsed,
        gemini_retries: attempt,
        gemini_duration_ms: totalMs,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Retry silently
    }
  }

  throw lastError;
}

/**
 * Build the Gemini prompt from request parameters
 */
function buildPrompt(topic: string, count: number, category?: string, excludeTitles?: string[]): string {
  const exclusionPart = excludeTitles && excludeTitles.length > 0
    ? `\n\nIMPORTANT: Do NOT include any of these items (they already exist in the list):
${excludeTitles.map((t) => `- ${t}`).join('\n')}`
    : '';

  const categoryPart = category ? ` in the "${category}" category` : '';

  return `Generate exactly ${count} items for a "${topic}" ranked list${categoryPart}.

ALSO provide:
- suggested_title: A concise, engaging list title based on the topic (e.g., "Greatest Horror Games of All Time", "Top Pizza Toppings")
- suggested_description: A brief description of what this list is about (max 120 characters)

REQUIREMENTS:
1. Each item MUST have a Wikipedia article - prioritize well-known, notable items
2. Use the item's common/popular name as the title — do NOT include Wikipedia disambiguation labels like "(video game)", "(film)", "(2008 video game)", "(band)", etc. For example use "Dead Space" not "Dead Space (2008 video game)", "Resident Evil" not "Resident Evil (1996 video game)", "Inside" not "Inside (video game)"
3. The wikipedia_url MUST still point to the correct Wikipedia article (which may include disambiguation in the URL — that's fine)

For each item provide:
- title: The item's popular/common name without any parenthetical labels
- description: A brief description (max 200 characters)
- wikipedia_url: The full, correct Wikipedia URL (e.g., https://en.wikipedia.org/wiki/Dead_Space_(2008_video_game))

Focus on items that are:
- Well-documented with Wikipedia articles
- Likely to have good images on Wikipedia
- Notable and recognizable

Each item must be unique - no duplicates.${exclusionPart}`;
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const limited = rateLimit(getRateLimitKey(request, 'studio-generate'), 10, 60_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const isStreaming = searchParams.get('stream') === 'true';

  if (isStreaming) {
    return handleStreamingGenerate(request);
  }

  return handleClassicGenerate(request);
}

/**
 * Classic (non-streaming) generation -- original behavior
 */
async function handleClassicGenerate(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json();
    const { topic, count, category, excludeTitles } = generateRequestSchema.parse(body);

    const ai = getGeminiClient();
    const prompt = buildPrompt(topic, count, category, excludeTitles);

    const { result: geminiResult } = await callGeminiWithRetry(ai, prompt, GEMINI_RESPONSE_SCHEMA as Record<string, unknown>, requestId);

    // Search Supabase for existing items to reuse images/IDs
    const titles = geminiResult.items.map(item => item.title);
    const existingItems = await findExistingItems(titles, category, requestId);

    const useEnrichmentPipeline = process.env.ENABLE_ENRICHMENT_PIPELINE !== 'false';
    const WIKI_CONCURRENCY = 6;
    const itemsWithImages = await pLimit(
      geminiResult.items.map((item) => async () =>
        enrichItem(item, existingItems, category, useEnrichmentPipeline, requestId)
      ),
      WIKI_CONCURRENCY
    );
    return NextResponse.json({
      items: itemsWithImages,
      suggested_title: geminiResult.suggested_title,
      suggested_description: geminiResult.suggested_description,
    });
  } catch (error) {
    return handleStudioError(error, 'Generation error', StudioErrorCodes.GENERATION_ERROR);
  }
}

/**
 * Streaming generation -- returns NDJSON with progressive items
 *
 * Line format:
 *  {"type":"meta","suggested_title":"...","suggested_description":"..."}
 *  {"type":"item","data":{...enriched item...},"index":N,"total":M}
 *  {"type":"done","total":N}
 *  {"type":"error","message":"..."}
 */
async function handleStreamingGenerate(request: NextRequest) {
  const requestId = crypto.randomUUID();

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ type: 'error', message: 'Invalid request body' }) + '\n',
      { status: 400, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-cache' } }
    );
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ type: 'error', message: 'Invalid request parameters' }) + '\n',
      { status: 400, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-cache' } }
    );
  }

  const { topic, count, category, excludeTitles } = parsed.data;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      function sendLine(obj: Record<string, unknown>) {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      }

      function safeClose() {
        if (!closed) {
          closed = true;
          controller.close();
        }
      }

      try {
        const ai = getGeminiClient();
        const prompt = buildPrompt(topic, count, category, excludeTitles);

        // Call Gemini with silent retry
        let geminiResult;
        try {
          const geminiResponse = await callGeminiWithRetry(ai, prompt, GEMINI_RESPONSE_SCHEMA as Record<string, unknown>, requestId);
          geminiResult = geminiResponse.result;
        } catch (err) {
          const rawMsg = err instanceof Error ? err.message : '';
          // Sanitize API key / provider errors — show generic message to user
          const isAuthError = rawMsg.includes('API key') || rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('INVALID_ARGUMENT');
          const message = isAuthError
            ? 'AI generation is temporarily unavailable. Please try again later.'
            : 'Generation failed. Try a more specific topic, or rephrase your request.';
          sendLine({
            type: 'error',
            message,
          });
          safeClose();
          return;
        }

        // Send meta line with suggested title/description
        sendLine({
          type: 'meta',
          suggested_title: geminiResult.suggested_title || '',
          suggested_description: geminiResult.suggested_description || '',
        });

        // Find existing DB items
        const titles = geminiResult.items.map(item => item.title);
        const existingItems = await findExistingItems(titles, category, requestId);

        const useEnrichmentPipeline = process.env.ENABLE_ENRICHMENT_PIPELINE !== 'false';
        const WIKI_CONCURRENCY = 6;
        const totalItems = geminiResult.items.length;

        // Process items in batches of WIKI_CONCURRENCY, streaming each as it completes
        const allEnrichedItems: Array<Record<string, unknown> & { enrichment_source: EnrichmentSource }> = [];
        let streamedIndex = 0;
        for (let batchStart = 0; batchStart < totalItems; batchStart += WIKI_CONCURRENCY) {
          const batchEnd = Math.min(batchStart + WIKI_CONCURRENCY, totalItems);
          const batchItems = geminiResult.items.slice(batchStart, batchEnd);

          const batchResults = await Promise.all(
            batchItems.map((item) =>
              enrichItem(item, existingItems, category, useEnrichmentPipeline, requestId)
            )
          );

          for (const enrichedItem of batchResults) {
            allEnrichedItems.push(enrichedItem);
            sendLine({
              type: 'item',
              data: enrichedItem,
              index: streamedIndex,
              total: totalItems,
            });
            streamedIndex++;
          }
        }

        // Send done line
        sendLine({ type: 'done', total: streamedIndex });
        safeClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        try {
          if (!closed) {
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: 'error', message }) + '\n')
            );
          }
        } catch {
          // Controller may already be closed
        }
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
