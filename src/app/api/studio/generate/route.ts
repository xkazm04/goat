/**
 * POST /api/studio/generate
 *
 * AI-powered list item generation endpoint using Google Gemini.
 * Generates items for a topic with titles, descriptions, and Wikipedia URLs,
 * then enriches with images from multiple sources via the enrichment pipeline.
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

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, count, category, excludeTitles } = generateRequestSchema.parse(body);

    const ai = getGeminiClient();

    // Build exclusion instruction if there are existing items
    const exclusionPart = excludeTitles && excludeTitles.length > 0
      ? `\n\nIMPORTANT: Do NOT include any of these items (they already exist in the list):
${excludeTitles.map((t) => `- ${t}`).join('\n')}`
      : '';

    // Build category context if provided
    const categoryPart = category ? ` in the "${category}" category` : '';

    // Build prompt for Gemini
    const prompt = `Generate exactly ${count} items for a "${topic}" ranked list${categoryPart}.

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

    // Convert Zod schema to JSON Schema and strip $schema field (Gemini doesn't accept it)
    const jsonSchema = zodToJsonSchema(geminiResponseSchema) as Record<string, unknown>;
    delete jsonSchema.$schema;

    // Generate with Gemini using structured output
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema,
      },
    });

    // Parse and validate Gemini response
    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from Gemini');
    }

    const geminiResult = geminiResponseSchema.parse(JSON.parse(responseText));

    // Search Supabase for existing items to reuse images/IDs
    const titles = geminiResult.items.map(item => item.title);
    const existingItems = await findExistingItems(titles, category);

    // Use enrichment pipeline for multi-source data enhancement
    const useEnrichmentPipeline = process.env.ENABLE_ENRICHMENT_PIPELINE === 'true';

    const itemsWithImages = await Promise.all(
      geminiResult.items.map(async (item) => {
        // Check if item exists in database first
        const normalizedTitle = item.title.toLowerCase().trim();
        const existingItem = existingItems.get(normalizedTitle);

        if (existingItem) {
          // Use existing item data from database
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
      })
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
