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
    const { topic, count } = generateRequestSchema.parse(body);

    const ai = getClient();

    // Build prompt for Gemini
    const prompt = `Generate exactly ${count} items for a "${topic}" ranked list.
For each item, provide:
- title: The item name
- description: A brief description (max 200 characters)
- wikipedia_url: The Wikipedia URL for this item if it exists, or null

Items should be notable and well-known examples relevant to the topic.`;

    // Generate with Gemini using structured output
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: zodToJsonSchema(geminiResponseSchema) as Record<string, unknown>,
      },
    });

    // Parse and validate Gemini response
    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from Gemini');
    }

    const geminiResult = geminiResponseSchema.parse(JSON.parse(responseText));

    // Fetch images in parallel from Wikipedia API
    const itemsWithImages = await Promise.all(
      geminiResult.items.map(async (item) => {
        const wikiImage = await fetchWikipediaImage(item.title);
        return {
          ...item,
          image_url: wikiImage?.url || null,
        };
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
