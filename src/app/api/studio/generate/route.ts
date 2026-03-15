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
import { zodToJsonSchema } from 'zod-to-json-schema';
import { fetchWikipediaImage } from '@/lib/api/wiki-images';
import { EnrichmentPipeline } from '@/lib/enrichment';
import { createClient } from '@/lib/supabase/server';
import {
  getGeminiClient,
  handleStudioError,
  extractWikiTitle,
  generateTitleVariations,
  extractYearFromTitle,
  StudioErrorCodes,
} from '@/lib/api/studio-utils';
import {
  generateRequestSchema,
  geminiResponseSchema,
} from '@/types/studio';
import type { GeneratedItem } from '@/types/studio';

export const dynamic = 'force-dynamic';
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
  category?: string
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
    const orConditions = titles.map(title => `name.ilike.${title}`).join(',');
    query = query.or(orConditions);

    // Optionally filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[Studio Generate] Supabase lookup error:', error.message);
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

    console.log(`[Studio Generate] Found ${resultMap.size}/${titles.length} items in database`);
    return resultMap;
  } catch (err) {
    console.warn('[Studio Generate] Failed to search existing items:', err);
    return resultMap;
  }
}

/**
 * Enrich a single item with images from DB, enrichment pipeline, or Wikipedia
 */
async function enrichItem(
  item: GeneratedItem,
  existingItems: Map<string, { id: string; name: string; image_url: string | null }>,
  category?: string,
  useEnrichmentPipeline = false
) {
  // Check if item exists in database first
  const normalizedTitle = item.title.toLowerCase().trim();
  const existingItem = existingItems.get(normalizedTitle);

  if (existingItem) {
    return {
      ...item,
      image_url: existingItem.image_url,
      db_matched: true,
      db_item_id: existingItem.id,
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
          enriched_data: {
            description: enrichResult.data.description || item.description,
            year: enrichResult.data.year,
            rating: enrichResult.data.rating,
            genres: enrichResult.data.genres,
            sources: enrichResult.data.sources,
          },
        };
      }
    } catch {
      // Fall through to Wikipedia fallback
    }
  }

  // Fallback: Wikipedia-only image lookup
  // Strategy 1: Try direct Wikipedia lookup with exact title
  let wikiImage = await fetchWikipediaImage(item.title);
  if (wikiImage?.url) {
    return { ...item, image_url: wikiImage.url, db_matched: false };
  }

  // Strategy 2: Extract title from Wikipedia URL if provided
  if (item.wikipedia_url) {
    const wikiTitle = extractWikiTitle(item.wikipedia_url);
    if (wikiTitle && wikiTitle !== item.title) {
      wikiImage = await fetchWikipediaImage(wikiTitle);
      if (wikiImage?.url) {
        return { ...item, image_url: wikiImage.url, db_matched: false };
      }
    }
  }

  // Strategy 3: Try common title variations
  const variations = generateTitleVariations(item.title);
  for (const variation of variations.slice(0, 3)) {
    wikiImage = await fetchWikipediaImage(variation);
    if (wikiImage?.url) {
      return { ...item, image_url: wikiImage.url, db_matched: false };
    }
  }

  return { ...item, image_url: null, db_matched: false };
}

/**
 * Call Gemini with one silent retry on failure
 */
async function callGeminiWithRetry(
  ai: ReturnType<typeof getGeminiClient>,
  prompt: string,
  jsonSchema: Record<string, unknown>
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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

      return geminiResponseSchema.parse(JSON.parse(responseText));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0) {
        console.warn('[Studio Generate] Gemini attempt 1 failed, retrying silently:', lastError.message);
      }
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
2. Use the EXACT Wikipedia article title for the item name (e.g., "The Legend of Zelda: Breath of the Wild" not "Zelda BOTW")
3. Include the full, correct Wikipedia URL

For each item provide:
- title: The exact name as it appears on Wikipedia (full official name, not abbreviations)
- description: A brief description (max 200 characters)
- wikipedia_url: The full Wikipedia URL (e.g., https://en.wikipedia.org/wiki/Article_Title)

Focus on items that are:
- Well-documented with Wikipedia articles
- Likely to have good images on Wikipedia
- Notable and recognizable

Each item must be unique - no duplicates.${exclusionPart}`;
}

export async function POST(request: NextRequest) {
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
  try {
    const body = await request.json();
    const { topic, count, category, excludeTitles } = generateRequestSchema.parse(body);

    const ai = getGeminiClient();
    const prompt = buildPrompt(topic, count, category, excludeTitles);

    // Convert Zod schema to JSON Schema and strip $schema field (Gemini doesn't accept it)
    const jsonSchema = zodToJsonSchema(geminiResponseSchema as any) as Record<string, unknown>;
    delete jsonSchema.$schema;

    const geminiResult = await callGeminiWithRetry(ai, prompt, jsonSchema);

    // Search Supabase for existing items to reuse images/IDs
    const titles = geminiResult.items.map(item => item.title);
    const existingItems = await findExistingItems(titles, category);

    const useEnrichmentPipeline = process.env.ENABLE_ENRICHMENT_PIPELINE !== 'false';
    const WIKI_CONCURRENCY = 6;

    const itemsWithImages = await pLimit(
      geminiResult.items.map((item) => async () =>
        enrichItem(item, existingItems, category, useEnrichmentPipeline)
      ),
      WIKI_CONCURRENCY
    );

    // Log matching stats
    const matchedCount = itemsWithImages.filter(i => i.db_matched).length;
    console.log(`[Studio Generate] Database matches: ${matchedCount}/${itemsWithImages.length}`);

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

      function sendLine(obj: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      }

      try {
        const ai = getGeminiClient();
        const prompt = buildPrompt(topic, count, category, excludeTitles);

        // Convert Zod schema to JSON Schema
        const jsonSchema = zodToJsonSchema(geminiResponseSchema as any) as Record<string, unknown>;
        delete jsonSchema.$schema;

        // Call Gemini with silent retry
        let geminiResult;
        try {
          geminiResult = await callGeminiWithRetry(ai, prompt, jsonSchema);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Generation failed';
          sendLine({
            type: 'error',
            message: `Generation failed after retry. ${message}. Try a more specific topic, or rephrase your request.`,
          });
          controller.close();
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
        const existingItems = await findExistingItems(titles, category);

        const useEnrichmentPipeline = process.env.ENABLE_ENRICHMENT_PIPELINE !== 'false';
        const WIKI_CONCURRENCY = 6;
        const totalItems = geminiResult.items.length;

        // Process items in batches of WIKI_CONCURRENCY, streaming each as it completes
        let streamedIndex = 0;
        for (let batchStart = 0; batchStart < totalItems; batchStart += WIKI_CONCURRENCY) {
          const batchEnd = Math.min(batchStart + WIKI_CONCURRENCY, totalItems);
          const batchItems = geminiResult.items.slice(batchStart, batchEnd);

          const batchResults = await Promise.all(
            batchItems.map((item) =>
              enrichItem(item, existingItems, category, useEnrichmentPipeline)
            )
          );

          for (const enrichedItem of batchResults) {
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
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        try {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: 'error', message }) + '\n')
          );
        } catch {
          // Controller may already be closed
        }
        controller.close();
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
