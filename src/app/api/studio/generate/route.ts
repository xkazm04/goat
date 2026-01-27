/**
 * POST /api/studio/generate
 *
 * AI-powered list item generation endpoint using Google Gemini.
 * Generates items for a topic with titles, descriptions, and Wikipedia URLs,
 * then enriches with images from Wikipedia API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { fetchWikipediaImage } from '@/lib/api/wiki-images';
import {
  generateRequestSchema,
  geminiResponseSchema,
  type StudioApiError,
} from '@/types/studio';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Lazy singleton for Gemini client
let aiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { topic, count, category, excludeTitles } = generateRequestSchema.parse(body);

    const ai = getClient();

    // Build exclusion instruction if there are existing items
    const exclusionPart = excludeTitles && excludeTitles.length > 0
      ? `\n\nIMPORTANT: Do NOT include any of these items (they already exist in the list):
${excludeTitles.map((t) => `- ${t}`).join('\n')}`
      : '';

    // Build category context if provided
    const categoryPart = category ? ` in the "${category}" category` : '';

    // Build prompt for Gemini
    const prompt = `Generate exactly ${count} items for a "${topic}" ranked list${categoryPart}.

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

    // Fetch images in parallel from Wikipedia API with fallback strategies
    const itemsWithImages = await Promise.all(
      geminiResult.items.map(async (item) => {
        // Strategy 1: Try direct Wikipedia lookup with exact title
        let wikiImage = await fetchWikipediaImage(item.title);
        if (wikiImage?.url) {
          return { ...item, image_url: wikiImage.url };
        }

        // Strategy 2: Extract title from Wikipedia URL if provided
        if (item.wikipedia_url) {
          const wikiTitle = extractWikiTitle(item.wikipedia_url);
          if (wikiTitle && wikiTitle !== item.title) {
            wikiImage = await fetchWikipediaImage(wikiTitle);
            if (wikiImage?.url) {
              return { ...item, image_url: wikiImage.url };
            }
          }
        }

        // Strategy 3: Try common title variations
        const variations = generateTitleVariations(item.title);
        for (const variation of variations.slice(0, 3)) { // Limit to avoid too many requests
          wikiImage = await fetchWikipediaImage(variation);
          if (wikiImage?.url) {
            return { ...item, image_url: wikiImage.url };
          }
        }

        return { ...item, image_url: null };
      })
    );

    return NextResponse.json({ items: itemsWithImages });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const errorResponse: StudioApiError = {
        error: 'Invalid request',
        details: error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Handle API key not configured
    if (error instanceof Error && error.message === 'GEMINI_API_KEY not configured') {
      const errorResponse: StudioApiError = {
        error: 'GEMINI_API_KEY not configured',
        code: 'CONFIG_ERROR',
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // Handle other errors
    console.error('Generation error:', error);
    const errorResponse: StudioApiError = {
      error: error instanceof Error ? error.message : 'Generation failed',
      code: 'GENERATION_ERROR',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Extract title from Wikipedia URL
 */
function extractWikiTitle(url: string): string | null {
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
function generateTitleVariations(title: string): string[] {
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
