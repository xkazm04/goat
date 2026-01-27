/**
 * POST /api/studio/find-image
 *
 * Finds an image for a given item title using whitelisted sources.
 * Uses Gemini to identify the correct Wikipedia article, then fetches the image.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { fetchWikipediaImage } from '@/lib/api/wiki-images';
import type { StudioApiError } from '@/types/studio';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Request schema
const findImageRequestSchema = z.object({
  title: z.string().min(1).max(200),
  context: z.string().max(500).optional(),
});

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
    const body = await request.json();
    const { title, context } = findImageRequestSchema.parse(body);

    // Strategy 1: Direct Wikipedia lookup
    let wikiImage = await fetchWikipediaImage(title);
    if (wikiImage?.url) {
      return NextResponse.json({ image_url: wikiImage.url, source: 'wikipedia_direct' });
    }

    const ai = getClient();

    // Strategy 2: Use Gemini to find the correct Wikipedia article title
    const wikiPrompt = `Find the exact Wikipedia article title for: "${title}"${context ? ` (context: ${context})` : ''}.

Return ONLY the exact Wikipedia article title. The title should be exactly as it appears in Wikipedia.

Common patterns:
- Abbreviations: "GTA V" → "Grand Theft Auto V", "COD" → "Call of Duty"
- Bands/Artists: "Beatles" → "The Beatles", "Coldplay" → "Coldplay"
- Games: "Zelda BOTW" → "The Legend of Zelda: Breath of the Wild"
- Movies: "LOTR" → "The Lord of the Rings (film series)"
- TV Shows: "GOT" → "Game of Thrones"
- Products: "iPhone" → "IPhone", "PS5" → "PlayStation 5"
- People: Include full name if needed

Return ONLY the title, nothing else. If truly unfindable, return the original: "${title}"`;

    const wikiResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: wikiPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const suggestedTitle = wikiResponse.text?.trim();
    if (suggestedTitle && suggestedTitle !== title) {
      wikiImage = await fetchWikipediaImage(suggestedTitle);
      if (wikiImage?.url) {
        return NextResponse.json({
          image_url: wikiImage.url,
          suggested_title: suggestedTitle,
          source: 'wikipedia_ai'
        });
      }
    }

    // Strategy 3: Try variations of the title
    const variations = generateTitleVariations(title);
    for (const variation of variations) {
      if (variation !== title && variation !== suggestedTitle) {
        wikiImage = await fetchWikipediaImage(variation);
        if (wikiImage?.url) {
          return NextResponse.json({
            image_url: wikiImage.url,
            suggested_title: variation,
            source: 'wikipedia_variation'
          });
        }
      }
    }

    // Strategy 4: Ask Gemini to find a direct image URL from reliable sources
    const imagePrompt = `Find a high-quality image URL for: "${title}"${context ? ` (${context})` : ''}.

Search for images from these trusted sources ONLY:
- Wikipedia/Wikimedia Commons
- Official websites
- Major retailers (Amazon product images)
- Official game/movie/music databases

Return a single direct image URL (ending in .jpg, .png, .webp).
If no reliable image found, return: null

Return ONLY the URL or null, nothing else.`;

    const imageResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: imagePrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const imageUrl = imageResponse.text?.trim();
    if (imageUrl && imageUrl !== 'null' && isValidImageUrl(imageUrl)) {
      return NextResponse.json({
        image_url: imageUrl,
        source: 'gemini_search'
      });
    }

    return NextResponse.json({
      image_url: null,
      suggested_title: suggestedTitle || null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: StudioApiError = {
        error: 'Invalid request',
        details: error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (error instanceof Error && error.message === 'GEMINI_API_KEY not configured') {
      const errorResponse: StudioApiError = {
        error: 'GEMINI_API_KEY not configured',
        code: 'CONFIG_ERROR',
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    console.error('Find image error:', error);
    const errorResponse: StudioApiError = {
      error: error instanceof Error ? error.message : 'Image search failed',
      code: 'IMAGE_SEARCH_ERROR',
    };
    return NextResponse.json(errorResponse, { status: 500 });
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

  // Add common suffixes for disambiguation
  variations.push(`${clean} (video game)`);
  variations.push(`${clean} (film)`);
  variations.push(`${clean} (band)`);
  variations.push(`${clean} (song)`);
  variations.push(`${clean} (album)`);
  variations.push(`${clean} (TV series)`);

  // Roman numerals to numbers and vice versa
  const romanToArabic: Record<string, string> = {
    ' II': ' 2', ' III': ' 3', ' IV': ' 4', ' V': ' 5',
    ' VI': ' 6', ' VII': ' 7', ' VIII': ' 8', ' IX': ' 9', ' X': ' 10',
  };
  for (const [roman, arabic] of Object.entries(romanToArabic)) {
    if (clean.includes(roman)) {
      variations.push(clean.replace(roman, arabic));
    }
    if (clean.includes(arabic)) {
      variations.push(clean.replace(arabic, roman));
    }
  }

  return variations;
}

/**
 * Validate that a URL looks like an image URL
 */
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);

    // Must be https
    if (parsed.protocol !== 'https:') return false;

    // Check for image extension or common image CDN patterns
    const path = parsed.pathname.toLowerCase();
    const hasImageExt = /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(path);
    const isImageCdn = parsed.hostname.includes('upload.wikimedia.org') ||
      parsed.hostname.includes('images-na.ssl-images-amazon.com') ||
      parsed.hostname.includes('m.media-amazon.com') ||
      parsed.hostname.includes('images.igdb.com') ||
      parsed.hostname.includes('image.tmdb.org');

    return hasImageExt || isImageCdn;
  } catch {
    return false;
  }
}
