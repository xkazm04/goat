import { NextRequest, NextResponse } from 'next/server';
import type { OEmbedResponse } from '@/lib/embed';
import { WIDGET_DIMENSIONS, generateIframeEmbed, DEFAULT_WIDGET_CONFIG } from '@/lib/embed';

/**
 * Parse list ID from a GOAT ranking URL
 */
function parseListIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');

    // Expected formats:
    // /share/[listId]
    // /ranking/[listId]
    // /list/[listId]
    const shareIndex = pathParts.findIndex(p => ['share', 'ranking', 'list'].includes(p));
    if (shareIndex !== -1 && pathParts[shareIndex + 1]) {
      return pathParts[shareIndex + 1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch list metadata
 * In production, this would query the database
 */
async function fetchListMetadata(listId: string): Promise<{
  title: string;
  author?: string;
  thumbnailUrl?: string;
} | null> {
  // Placeholder - would fetch from database
  return {
    title: 'GOAT Ranking',
    author: 'GOAT User',
  };
}

/**
 * GET handler - oEmbed discovery endpoint
 * Follows the oEmbed specification: https://oembed.com/
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Required parameter
  const url = searchParams.get('url');
  if (!url) {
    return NextResponse.json(
      { error: 'Missing required parameter: url' },
      { status: 400 }
    );
  }

  // Parse list ID from URL
  const listId = parseListIdFromUrl(url);
  if (!listId) {
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400 }
    );
  }

  // Optional parameters
  const format = searchParams.get('format') || 'json';
  const maxWidth = Math.min(800, parseInt(searchParams.get('maxwidth') || '600', 10));
  const maxHeight = Math.min(800, parseInt(searchParams.get('maxheight') || '600', 10));

  // Only JSON format is supported
  if (format !== 'json') {
    return NextResponse.json(
      { error: 'Format not supported. Use format=json' },
      { status: 501 }
    );
  }

  // Fetch list metadata
  const metadata = await fetchListMetadata(listId);
  if (!metadata) {
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    );
  }

  // Determine best size based on constraints
  let size: 'compact' | 'standard' | 'full' = 'standard';
  if (maxWidth < WIDGET_DIMENSIONS.standard.width || maxHeight < WIDGET_DIMENSIONS.standard.height) {
    size = 'compact';
  } else if (maxWidth >= WIDGET_DIMENSIONS.full.width && maxHeight >= WIDGET_DIMENSIONS.full.height) {
    size = 'full';
  }

  const dimensions = WIDGET_DIMENSIONS[size];

  // Generate embed HTML
  const embedHtml = generateIframeEmbed({
    listId,
    ...DEFAULT_WIDGET_CONFIG,
    size,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';

  // Build oEmbed response
  const response: OEmbedResponse = {
    type: 'rich',
    version: '1.0',
    title: metadata.title,
    author_name: metadata.author,
    author_url: metadata.author ? `${baseUrl}/user/${encodeURIComponent(metadata.author)}` : undefined,
    provider_name: 'GOAT Rankings',
    provider_url: baseUrl,
    cache_age: 3600, // 1 hour
    thumbnail_url: metadata.thumbnailUrl || `${baseUrl}/api/og/${listId}`,
    thumbnail_width: 1200,
    thumbnail_height: 630,
    html: embedHtml,
    width: dimensions.width,
    height: dimensions.height,
  };

  return NextResponse.json(response, {
    headers: {
      'Content-Type': 'application/json+oembed',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

/**
 * HEAD handler - for discovery
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json+oembed',
    },
  });
}
