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

    // First try direct Wikipedia lookup
    let wikiImage = await fetchWikipediaImage(title);

    if (wikiImage?.url) {
      return NextResponse.json({ image_url: wikiImage.url });
    }

    // If direct lookup fails, use Gemini to find the correct Wikipedia article
    const ai = getClient();

    const prompt = `I need to find a Wikipedia article for: "${title}"${context ? ` (context: ${context})` : ''}.

Return ONLY the exact Wikipedia article title that best matches this item.
The title should be exactly as it appears in the Wikipedia article URL.

For example:
- "GTA V" → "Grand Theft Auto V"
- "Beatles" → "The Beatles"
- "iPhone" → "IPhone"

Return only the title, nothing else.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const suggestedTitle = response.text?.trim();

    if (suggestedTitle && suggestedTitle !== title) {
      // Try Wikipedia lookup with the suggested title
      wikiImage = await fetchWikipediaImage(suggestedTitle);
    }

    return NextResponse.json({
      image_url: wikiImage?.url || null,
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
