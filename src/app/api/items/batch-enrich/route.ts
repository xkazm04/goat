/**
 * Batch Item Enrichment API Endpoint
 *
 * Enriches multiple items with data from multiple sources.
 *
 * POST /api/items/batch-enrich
 * Body: { items: EnrichmentInput[], priority?: 'low' | 'normal' | 'high' }
 *
 * Returns enriched data for all items with timing statistics.
 */

import { NextRequest, NextResponse } from 'next/server';

import { EnrichmentPipeline } from '@/lib/enrichment';

import type { EnrichmentInput, BatchEnrichmentRequest } from '@/lib/enrichment';

interface BatchRequestBody {
  items: Array<{
    name: string;
    category: string;
    subcategory?: string;
    hints?: {
      year?: number;
      director?: string;
      artist?: string;
      author?: string;
    };
  }>;
  priority?: 'low' | 'normal' | 'high';
  config?: {
    maxParallelSources?: number;
    sourceTimeoutMs?: number;
    minConfidence?: number;
  };
}

const MAX_BATCH_SIZE = 50;

/**
 * POST /api/items/batch-enrich
 *
 * Enrich multiple items in batch
 */
export async function POST(request: NextRequest) {
  try {
    const body: BatchRequestBody = await request.json();

    // Validate items array
    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Missing required field: items (array)' },
        { status: 400 }
      );
    }

    if (body.items.length === 0) {
      return NextResponse.json(
        { error: 'Items array cannot be empty' },
        { status: 400 }
      );
    }

    if (body.items.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} items` },
        { status: 400 }
      );
    }

    // Validate each item
    const validatedItems: EnrichmentInput[] = [];
    const validationErrors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];

      if (!item.name || typeof item.name !== 'string') {
        validationErrors.push({ index: i, error: 'Missing or invalid name' });
        continue;
      }

      if (!item.category || typeof item.category !== 'string') {
        validationErrors.push({ index: i, error: 'Missing or invalid category' });
        continue;
      }

      validatedItems.push({
        name: item.name.trim(),
        category: item.category.trim(),
        subcategory: item.subcategory?.trim(),
        hints: item.hints,
      });
    }

    if (validationErrors.length > 0 && validatedItems.length === 0) {
      return NextResponse.json(
        {
          error: 'All items failed validation',
          validationErrors,
        },
        { status: 400 }
      );
    }

    // Build batch request
    const batchRequest: BatchEnrichmentRequest = {
      items: validatedItems,
      priority: body.priority || 'normal',
      config: body.config,
    };

    // Run batch enrichment
    const result = await EnrichmentPipeline.enrichBatch(batchRequest);

    // Format response
    const response = {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      timing: {
        totalMs: result.timing.completedAt - result.timing.startedAt,
        averagePerItemMs: Math.round(result.timing.averagePerItem),
      },
      results: result.results.map((r, index) => ({
        index,
        input: {
          name: r.input.name,
          category: r.input.category,
        },
        success: r.success,
        data: r.data
          ? {
              name: r.data.name,
              description: r.data.description?.substring(0, 200),
              year: r.data.year,
              images: r.data.images.length,
              selectedImage: r.data.selectedImage?.url,
              confidence: r.data.confidence,
              sources: r.data.sources,
            }
          : undefined,
        errors: r.errors.length > 0 ? r.errors : undefined,
      })),
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Batch Enrich API] Error:', error);

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
 * GET /api/items/batch-enrich
 *
 * Get batch processing limits and status
 */
export async function GET() {
  try {
    const availableSources = EnrichmentPipeline.getAvailableSources();

    return NextResponse.json({
      maxBatchSize: MAX_BATCH_SIZE,
      availableSources,
      priorities: ['low', 'normal', 'high'],
      estimatedTimePerItem: {
        low: '2-5s',
        normal: '1-3s',
        high: '0.5-2s',
      },
    });
  } catch (error) {
    console.error('[Batch Enrich API] GET Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
