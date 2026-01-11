import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  extractApiKey,
  validateApiKey,
  checkRateLimit,
  createApiHeaders,
  apiError,
  handleCors,
} from '@/lib/api/public-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/categories
 *
 * Returns available categories and subcategories for the ranking API.
 */
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const apiKey = extractApiKey(request);
  if (!apiKey) {
    return apiError('API key required', 401, 'MISSING_API_KEY');
  }

  const keyValidation = await validateApiKey(apiKey);
  if (!keyValidation || !keyValidation.valid) {
    return apiError('Invalid API key', 401, 'INVALID_API_KEY');
  }

  const rateLimit = checkRateLimit(apiKey, keyValidation.tier);
  if (!rateLimit.allowed) {
    const headers = createApiHeaders(rateLimit, keyValidation.tier);
    return new NextResponse(
      JSON.stringify({
        error: { message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED', status: 429 },
      }),
      { status: 429, headers }
    );
  }

  try {
    const supabase = await createClient();

    // Fetch distinct categories and subcategories
    const { data: items, error } = await supabase
      .from('top_items')
      .select('category, subcategory')
      .not('category', 'is', null);

    if (error) {
      console.error('Error fetching categories:', error);
      return apiError('Failed to fetch categories', 500, 'DATABASE_ERROR');
    }

    // Aggregate categories and subcategories
    const categoryMap: Record<string, Set<string>> = {};
    (items || []).forEach((item) => {
      if (item.category) {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = new Set();
        }
        if (item.subcategory) {
          categoryMap[item.category].add(item.subcategory);
        }
      }
    });

    // Transform to response format
    const categories = Object.entries(categoryMap).map(([category, subcategories]) => ({
      id: category.toLowerCase().replace(/\s+/g, '-'),
      name: category,
      subcategories: Array.from(subcategories).sort().map((sub) => ({
        id: sub.toLowerCase().replace(/\s+/g, '-'),
        name: sub,
      })),
      itemCount: (items || []).filter((i) => i.category === category).length,
    }));

    const response = {
      categories: categories.sort((a, b) => a.name.localeCompare(b.name)),
      meta: {
        totalCategories: categories.length,
        totalSubcategories: categories.reduce((sum, c) => sum + c.subcategories.length, 0),
        lastUpdated: new Date().toISOString(),
        apiVersion: '1.0',
      },
    };

    const headers = createApiHeaders(rateLimit, keyValidation.tier);
    headers.set('Content-Type', 'application/json');

    return new NextResponse(JSON.stringify(response), { status: 200, headers });
  } catch (error) {
    console.error('Error in categories API:', error);
    return apiError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, X-API-Key, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
