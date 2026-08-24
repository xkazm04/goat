import { NextRequest, NextResponse } from 'next/server';

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
 * GET /api/v1/sdk
 *
 * Returns SDK initialization configuration for embedded widgets.
 * Provides available categories, widget types, and tier-specific features.
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

  const headers = createApiHeaders(rateLimit, keyValidation.tier);
  headers.set('Content-Type', 'application/json');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';

  return new NextResponse(
    JSON.stringify({
      sdk: {
        version: '1.0.0',
        baseUrl,
        apiUrl: `${baseUrl}/api/v1`,
        embedUrl: `${baseUrl}/api/v1/widgets/embed.js`,
      },
      tier: keyValidation.tier,
      features: keyValidation.features,
      widgetTypes: [
        {
          type: 'ranking',
          description: 'Display consensus rankings as a list',
          requiredParams: ['category'],
          optionalParams: ['subcategory', 'limit', 'theme', 'showVolatility'],
        },
        {
          type: 'badge',
          description: 'Show a compact rank badge for a single item',
          requiredParams: ['itemId'],
          optionalParams: ['theme'],
        },
        {
          type: 'interactive',
          description: 'Embeddable drag-to-rank widget that collects user rankings',
          requiredParams: ['category'],
          optionalParams: ['limit', 'theme', 'sessionId'],
        },
      ],
      endpoints: {
        rankings: `${baseUrl}/api/v1/rankings`,
        submit: `${baseUrl}/api/v1/rankings/submit`,
        aggregate: `${baseUrl}/api/v1/rankings/aggregate`,
        categories: `${baseUrl}/api/v1/categories`,
        trends: `${baseUrl}/api/v1/trends`,
        analytics: `${baseUrl}/api/v1/analytics`,
        embed: `${baseUrl}/api/v1/widgets/embed.js`,
      },
      rateLimits: {
        perMinute: { free: 10, basic: 60, pro: 300, enterprise: 1000 }[keyValidation.tier],
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn,
      },
    }),
    { status: 200, headers }
  );
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
