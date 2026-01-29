import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Whitelisted domains from next.config.js
const WHITELISTED_DOMAINS = [
  // Primary sources
  'upload.wikimedia.org',
  'm.media-amazon.com',
  'static.wikia.nocookie.net',
  // Secondary sources
  'cdn.britannica.com',
  'media.d3.nhle.com',
  'files.eliteprospects.com',
  // WordPress-hosted
  'i0.wp.com',
  'i1.wp.com',
  'i2.wp.com',
];

function isValidUrl(urlString: string | null): boolean {
  if (!urlString) return false;
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLocalPath(urlString: string | null): boolean {
  if (!urlString) return false;
  return urlString.startsWith('/') && !urlString.startsWith('//');
}

function getDomain(urlString: string): string | null {
  try {
    return new URL(urlString).hostname;
  } catch {
    return null;
  }
}

function isWhitelisted(urlString: string): boolean {
  const domain = getDomain(urlString);
  return domain !== null && WHITELISTED_DOMAINS.includes(domain);
}

interface ValidationResult {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  image_url: string | null;
  issues: string[];
  domain?: string | null;
}

/**
 * GET /api/items/validate - Get items with image issues
 *
 * Query params:
 *   - issue: Filter by issue type (missing, local_path, invalid_url, non_whitelisted)
 *   - category: Filter by category
 *   - limit: Max items to return (default 100)
 *   - check_http: If "true", also check HTTP status (slower)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const issueFilter = searchParams.get('issue');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100');
    const checkHttp = searchParams.get('check_http') === 'true';

    // Fetch items
    let query = supabase
      .from('items')
      .select('id, name, category, subcategory, image_url')
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data: items, error } = await query.limit(2000);

    if (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Validate each item
    const results: ValidationResult[] = [];

    for (const item of items || []) {
      const issues: string[] = [];
      let domain: string | null = null;

      if (!item.image_url) {
        issues.push('missing');
      } else if (isLocalPath(item.image_url)) {
        issues.push('local_path');
      } else if (!isValidUrl(item.image_url)) {
        issues.push('invalid_url');
      } else {
        domain = getDomain(item.image_url);
        if (!isWhitelisted(item.image_url)) {
          issues.push('non_whitelisted');
        }

        // Optional HTTP check
        if (checkHttp && issues.length === 0) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(item.image_url, {
              method: 'HEAD',
              signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!response.ok) {
              issues.push('http_error');
            }
          } catch {
            issues.push('http_error');
          }
        }
      }

      // Apply issue filter
      if (issueFilter && !issues.includes(issueFilter)) {
        continue;
      }

      if (issues.length > 0) {
        results.push({
          id: item.id,
          name: item.name,
          category: item.category,
          subcategory: item.subcategory,
          image_url: item.image_url,
          issues,
          domain,
        });
      }
    }

    // Calculate summary
    const summary = {
      total_items: items?.length || 0,
      items_with_issues: results.length,
      by_issue: {
        missing: results.filter(r => r.issues.includes('missing')).length,
        local_path: results.filter(r => r.issues.includes('local_path')).length,
        invalid_url: results.filter(r => r.issues.includes('invalid_url')).length,
        non_whitelisted: results.filter(r => r.issues.includes('non_whitelisted')).length,
        http_error: results.filter(r => r.issues.includes('http_error')).length,
      },
    };

    // Group non-whitelisted by domain
    const domainCounts: Record<string, number> = {};
    for (const item of results.filter(r => r.issues.includes('non_whitelisted'))) {
      const d = item.domain || 'unknown';
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }

    return NextResponse.json({
      summary,
      non_whitelisted_domains: Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([domain, count]) => ({ domain, count })),
      items: results.slice(0, limit),
      has_more: results.length > limit,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/items/validate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
