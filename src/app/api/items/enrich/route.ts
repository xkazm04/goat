/**
 * Item Enrichment API Endpoint
 *
 * Enriches a single item with data from multiple sources.
 *
 * POST /api/items/enrich
 * Body: { name: string, category: string, subcategory?: string, hints?: object }
 *
 * Returns enriched item data from TMDB, IGDB, Spotify, Wikipedia, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { EnrichmentPipeline } from '@/lib/enrichment';
import type { EnrichmentInput } from '@/lib/enrichment';

interface EnrichmentRequestBody {
  name: string;
  category: string;
  subcategory?: string;
  hints?: {
    year?: number;
    director?: string;
    artist?: string;
    author?: string;
  };
}

/**
 * POST /api/items/enrich
 *
 * Enrich a single item with multi-source data
 */
export async function POST(request: NextRequest) {
  try {
    const body: EnrichmentRequestBody = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    if (!body.category || typeof body.category !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: category' },
        { status: 400 }
      );
    }

    // Build enrichment input
    const input: EnrichmentInput = {
      name: body.name.trim(),
      category: body.category.trim(),
      subcategory: body.subcategory?.trim(),
      hints: body.hints,
    };

    // Run enrichment pipeline
    const result = await EnrichmentPipeline.enrich(input);

    // Return result
    return NextResponse.json({
      success: result.success,
      data: result.data,
      sources: result.sourcesUsed,
      errors: result.errors.length > 0 ? result.errors : undefined,
      timing: {
        durationMs: result.timing.durationMs,
      },
    });
  } catch (error) {
    console.error('[Enrich API] Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/items/enrich
 *
 * Get available sources and their status
 */
export async function GET() {
  try {
    const availableSources = EnrichmentPipeline.getAvailableSources();
    const config = EnrichmentPipeline.getConfig();

    return NextResponse.json({
      availableSources,
      config: {
        maxParallelSources: config.maxParallelSources,
        sourceTimeoutMs: config.sourceTimeoutMs,
        minConfidence: config.minConfidence,
      },
      categories: [
        { id: 'movies', primary: ['tmdb'], fallback: ['wikipedia'] },
        { id: 'tv', primary: ['tmdb'], fallback: ['wikipedia'] },
        { id: 'games', primary: ['igdb'], fallback: ['wikipedia'] },
        { id: 'music', primary: ['spotify'], fallback: ['wikipedia'] },
        { id: 'books', primary: ['openlibrary'], fallback: ['wikipedia'] },
        { id: 'sports', primary: ['wikipedia'], fallback: [] },
        { id: 'general', primary: ['wikipedia'], fallback: [] },
      ],
    });
  } catch (error) {
    console.error('[Enrich API] GET Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
