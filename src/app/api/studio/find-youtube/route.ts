/**
 * POST /api/studio/find-youtube
 *
 * Finds the official YouTube video URL for a music item.
 * Uses Gemini with Google Search to find the best official source.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractYouTubeId } from '@/lib/youtube';
import { getGeminiClient, GEMINI_MODEL_PRIMARY } from '@/lib/providers/gemini-client';
import {
  handleStudioError,
  StudioErrorCodes,
} from '@/lib/api/studio-utils';
import { rateLimit, getRateLimitKey } from '@/lib/api/rate-limiter';

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

export async function POST(request: NextRequest) {
  // Rate limit: 20 requests per minute per IP
  const limited = rateLimit(getRateLimitKey(request, 'studio-find-youtube'), 20, 60_000);
  if (limited) return limited;

  const requestStart = performance.now();

  try {
    const body = await request.json();
    const { title, artist, context } = findYouTubeRequestSchema.parse(body);

    const ai = getGeminiClient();

    // Build search query
    const searchQuery = artist ? `${title} by ${artist}` : title;
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

    const geminiStart = performance.now();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_PRIMARY,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
      },
    });
    const geminiMs = Math.round(performance.now() - geminiStart);

    const responseText = response.text?.trim() || '{}';

    // Parse the JSON response
    let parsedResponse: { youtube_url?: string; video_title?: string };
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (err) {
      console.warn(`[Find YouTube] JSON parse failed for "${title}":`, err instanceof Error ? err.message : err);
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

    console.log('[Find YouTube] find_youtube_complete', JSON.stringify({
      operation: 'gemini_find_youtube',
      title,
      artist: artist || null,
      resolved: !!youtubeUrl,
      duration_ms: Math.round(performance.now() - requestStart),
      gemini_ms: geminiMs,
    }));

    const result: FindYouTubeResponse = {
      youtube_url: youtubeUrl,
      youtube_id: youtubeId,
      video_title: videoTitle,
    };

    return NextResponse.json(result);
  } catch (error) {
    return handleStudioError(error, 'Find YouTube error', StudioErrorCodes.YOUTUBE_SEARCH_ERROR);
  }
}
