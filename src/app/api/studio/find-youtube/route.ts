/**
 * POST /api/studio/find-youtube
 *
 * Finds the official YouTube video URL for a music item.
 * Uses Gemini with Google Search to find the best official source.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { extractYouTubeId } from '@/lib/youtube';
import type { StudioApiError } from '@/types/studio';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Request schema
const findYouTubeRequestSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().max(200).optional(),
  context: z.string().max(100).optional(), // e.g., "song", "album", "music video"
});

// Response type
interface FindYouTubeResponse {
  youtube_url: string | null;
  youtube_id: string | null;
  video_title: string | null;
}

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
    const { title, artist, context } = findYouTubeRequestSchema.parse(body);

    const ai = getClient();

    // Build search query
    const searchQuery = artist
      ? `${title} by ${artist}`
      : title;

    const contextHint = context || 'song';

    const prompt = `Find the official YouTube video for the ${contextHint}: "${searchQuery}"

Requirements:
1. Return the FULL YouTube URL (e.g., https://www.youtube.com/watch?v=XXXXXXXXXXX)
2. Prefer official sources in this order:
   - Official artist channel
   - VEVO channel
   - Official audio/lyric video
   - Most popular reputable upload
3. Do NOT return fan covers, remixes, or unofficial uploads
4. Do NOT return live performances unless no studio version exists

Respond in this exact JSON format:
{
  "youtube_url": "https://www.youtube.com/watch?v=...",
  "video_title": "Artist - Song Title (Official Video)"
}

If no suitable video is found, respond with:
{
  "youtube_url": null,
  "video_title": null
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';

    // Parse the JSON response
    let parsedResponse: { youtube_url?: string; video_title?: string };
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      // Try to extract URL from text if JSON parsing fails
      const urlMatch = responseText.match(
        /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      if (urlMatch) {
        parsedResponse = { youtube_url: urlMatch[0] };
      } else {
        parsedResponse = {};
      }
    }

    const youtubeUrl = parsedResponse.youtube_url || null;
    const videoTitle = parsedResponse.video_title || null;
    const youtubeId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;

    const result: FindYouTubeResponse = {
      youtube_url: youtubeUrl,
      youtube_id: youtubeId,
      video_title: videoTitle,
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: StudioApiError = {
        error: 'Invalid request',
        details: error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (
      error instanceof Error &&
      error.message === 'GEMINI_API_KEY not configured'
    ) {
      const errorResponse: StudioApiError = {
        error: 'GEMINI_API_KEY not configured',
        code: 'CONFIG_ERROR',
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    console.error('Find YouTube error:', error);
    const errorResponse: StudioApiError = {
      error: error instanceof Error ? error.message : 'YouTube search failed',
      code: 'YOUTUBE_SEARCH_ERROR',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
