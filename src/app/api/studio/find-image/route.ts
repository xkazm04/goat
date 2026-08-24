/**
 * POST /api/studio/find-image
 *
 * Finds an image for a given item title using whitelisted sources.
 * Uses Gemini to identify the correct Wikipedia article, then fetches the image.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, getRateLimitKey } from '@/lib/api/rate-limiter';
import { handleStudioError, StudioErrorCodes } from '@/lib/api/studio-utils';
import { fetchWikipediaImage } from '@/lib/api/wiki-images';
import { getGeminiClient, GEMINI_MODEL_PRIMARY } from '@/lib/providers/gemini-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Request schema
const findImageRequestSchema = z.object({
  title: z.string().min(1).max(200),
  context: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const limited = rateLimit(getRateLimitKey(request, 'studio-find-image'), 30, 60_000);
  if (limited) return limited;

  const requestStart = performance.now();

  try {
    const body = await request.json();
    const { title, context } = findImageRequestSchema.parse(body);

    // Strategy 1: Direct Wikipedia lookup
    const s1Start = performance.now();
    let wikiImage = await fetchWikipediaImage(title);
    const s1Ms = Math.round(performance.now() - s1Start);
    if (wikiImage?.url) {
      console.log('[Find Image] find_image_complete', JSON.stringify({
        operation: 'find_image',
        title,
        source: 'wikipedia_direct',
        resolved: true,
        duration_ms: Math.round(performance.now() - requestStart),
        strategy_timing: { direct_wiki_ms: s1Ms },
      }));
      return NextResponse.json({ image_url: wikiImage.url, source: 'wikipedia_direct' });
    }

    const ai = getGeminiClient();

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

    const s2Start = performance.now();
    const wikiResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: wikiPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const s2GeminiMs = Math.round(performance.now() - s2Start);

    const suggestedTitle = wikiResponse.text?.trim();
    if (suggestedTitle && suggestedTitle !== title) {
      wikiImage = await fetchWikipediaImage(suggestedTitle);
      if (wikiImage?.url) {
        const s2Ms = Math.round(performance.now() - s2Start);
        console.log('[Find Image] find_image_complete', JSON.stringify({
          operation: 'find_image',
          title,
          source: 'wikipedia_ai',
          resolved: true,
          duration_ms: Math.round(performance.now() - requestStart),
          strategy_timing: { direct_wiki_ms: s1Ms, gemini_wiki_lookup_ms: s2GeminiMs, strategy2_total_ms: s2Ms },
        }));
        return NextResponse.json({
          image_url: wikiImage.url,
          suggested_title: suggestedTitle,
          source: 'wikipedia_ai'
        });
      }
    }

    // Strategy 3: Try variations of the title
    const s3Start = performance.now();
    const variations = generateTitleVariations(title);
    for (const variation of variations) {
      if (variation !== title && variation !== suggestedTitle) {
        wikiImage = await fetchWikipediaImage(variation);
        if (wikiImage?.url) {
          const s3Ms = Math.round(performance.now() - s3Start);
          console.log('[Find Image] find_image_complete', JSON.stringify({
            operation: 'find_image',
            title,
            source: 'wikipedia_variation',
            resolved: true,
            duration_ms: Math.round(performance.now() - requestStart),
            strategy_timing: { direct_wiki_ms: s1Ms, gemini_wiki_lookup_ms: s2GeminiMs, variations_ms: s3Ms },
          }));
          return NextResponse.json({
            image_url: wikiImage.url,
            suggested_title: variation,
            source: 'wikipedia_variation'
          });
        }
      }
    }
    const s3Ms = Math.round(performance.now() - s3Start);

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

    const s4Start = performance.now();
    const imageResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: imagePrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const s4Ms = Math.round(performance.now() - s4Start);

    const imageUrl = imageResponse.text?.trim();
    if (imageUrl && imageUrl !== 'null' && isValidImageUrl(imageUrl)) {
      console.log('[Find Image] find_image_complete', JSON.stringify({
        operation: 'find_image',
        title,
        source: 'gemini_search',
        resolved: true,
        duration_ms: Math.round(performance.now() - requestStart),
        strategy_timing: { direct_wiki_ms: s1Ms, gemini_wiki_lookup_ms: s2GeminiMs, variations_ms: s3Ms, gemini_image_search_ms: s4Ms },
      }));
      return NextResponse.json({
        image_url: imageUrl,
        source: 'gemini_search'
      });
    }

    console.log('[Find Image] find_image_complete', JSON.stringify({
      operation: 'find_image',
      title,
      source: 'none',
      resolved: false,
      duration_ms: Math.round(performance.now() - requestStart),
      strategy_timing: { direct_wiki_ms: s1Ms, gemini_wiki_lookup_ms: s2GeminiMs, variations_ms: s3Ms, gemini_image_search_ms: s4Ms },
    }));

    return NextResponse.json({
      image_url: null,
      suggested_title: suggestedTitle || null,
    });
  } catch (error) {
    return handleStudioError(error, 'Find image error', StudioErrorCodes.IMAGE_SEARCH_ERROR);
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
