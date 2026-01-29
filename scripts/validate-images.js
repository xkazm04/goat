#!/usr/bin/env node
/**
 * Image Validation Script
 *
 * Validates all image URLs in the database and reports:
 * - Missing images (no URL)
 * - Invalid URLs (malformed, local paths)
 * - Broken URLs (404, timeout, etc.)
 * - Non-whitelisted domains
 *
 * Usage:
 *   node scripts/validate-images.js                    # Full report
 *   node scripts/validate-images.js --check-http       # Also verify HTTP status (slower)
 *   node scripts/validate-images.js --output broken.json # Save broken items to file
 *   node scripts/validate-images.js --fix-local        # Report local paths needing replacement
 */

const fs = require('fs');

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const CONCURRENT_REQUESTS = 10;
const HTTP_TIMEOUT = 5000;

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

// Parse args
const args = process.argv.slice(2);
const CHECK_HTTP = args.includes('--check-http');
const FIX_LOCAL = args.includes('--fix-local');
const outputIndex = args.indexOf('--output');
const OUTPUT_FILE = outputIndex !== -1 ? args[outputIndex + 1] : null;

function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLocalPath(urlString) {
  if (!urlString) return false;
  return urlString.startsWith('/') && !urlString.startsWith('//');
}

function getDomain(urlString) {
  try {
    return new URL(urlString).hostname;
  } catch {
    return null;
  }
}

function isWhitelisted(urlString) {
  const domain = getDomain(urlString);
  return domain && WHITELISTED_DOMAINS.includes(domain);
}

async function checkHttpStatus(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageValidator/1.0)',
      },
    });
    clearTimeout(timeout);
    return { status: response.status, ok: response.ok };
  } catch (error) {
    clearTimeout(timeout);
    return { status: 0, ok: false, error: error.message };
  }
}

async function checkBatch(items, checkHttp) {
  const results = [];

  for (const item of items) {
    const result = {
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      image_url: item.image_url,
      issues: [],
    };

    const url = item.image_url;

    if (!url) {
      result.issues.push('MISSING');
    } else if (isLocalPath(url)) {
      result.issues.push('LOCAL_PATH');
    } else if (!isValidUrl(url)) {
      result.issues.push('INVALID_URL');
    } else {
      if (!isWhitelisted(url)) {
        result.issues.push('NON_WHITELISTED');
        result.domain = getDomain(url);
      }

      if (checkHttp) {
        const httpResult = await checkHttpStatus(url);
        if (!httpResult.ok) {
          result.issues.push('HTTP_ERROR');
          result.httpStatus = httpResult.status;
          result.httpError = httpResult.error;
        }
      }
    }

    if (result.issues.length > 0) {
      results.push(result);
    }
  }

  return results;
}

async function main() {
  console.log('🔍 Image Validation Script');
  console.log('='.repeat(50));
  console.log('API Base:', API_BASE);
  console.log('Check HTTP:', CHECK_HTTP ? 'Yes (slower)' : 'No');
  console.log('');

  // Fetch all items
  console.log('📥 Fetching items...');
  const response = await fetch(`${API_BASE}/api/top/items?limit=5000`);
  const data = await response.json();
  const items = data.items || [];
  console.log(`   Found ${items.length} items (total: ${data.total})\n`);

  // Validate in batches
  console.log('🔄 Validating images...');
  const allBroken = [];

  for (let i = 0; i < items.length; i += CONCURRENT_REQUESTS) {
    const batch = items.slice(i, i + CONCURRENT_REQUESTS);
    const results = await checkBatch(batch, CHECK_HTTP);
    allBroken.push(...results);

    if (CHECK_HTTP) {
      process.stdout.write(`   Progress: ${Math.min(i + CONCURRENT_REQUESTS, items.length)}/${items.length}\r`);
    }
  }

  console.log('');

  // Categorize results
  const missing = allBroken.filter(r => r.issues.includes('MISSING'));
  const localPaths = allBroken.filter(r => r.issues.includes('LOCAL_PATH'));
  const invalidUrls = allBroken.filter(r => r.issues.includes('INVALID_URL'));
  const nonWhitelisted = allBroken.filter(r => r.issues.includes('NON_WHITELISTED'));
  const httpErrors = allBroken.filter(r => r.issues.includes('HTTP_ERROR'));

  // Report
  console.log('\n📊 Validation Results');
  console.log('='.repeat(50));
  console.log(`Total items:        ${items.length}`);
  console.log(`Items with issues:  ${allBroken.length}`);
  console.log('');
  console.log('Issue Breakdown:');
  console.log(`  ❌ Missing image:     ${missing.length}`);
  console.log(`  📁 Local paths:       ${localPaths.length}`);
  console.log(`  ⚠️  Invalid URLs:      ${invalidUrls.length}`);
  console.log(`  🚫 Non-whitelisted:   ${nonWhitelisted.length}`);
  if (CHECK_HTTP) {
    console.log(`  💔 HTTP errors:       ${httpErrors.length}`);
  }

  // Show non-whitelisted domain breakdown
  if (nonWhitelisted.length > 0) {
    console.log('\n🌐 Non-Whitelisted Domains:');
    const domainCounts = {};
    for (const item of nonWhitelisted) {
      const domain = item.domain || 'unknown';
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    }
    Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([domain, count]) => {
        console.log(`    ${domain}: ${count}`);
      });
  }

  // Show items needing replacement
  if (FIX_LOCAL || localPaths.length > 0) {
    console.log('\n📁 Items with Local Paths (need replacement):');
    localPaths.slice(0, 20).forEach(item => {
      console.log(`  - ${item.name} (${item.category})`);
      console.log(`    Current: ${item.image_url}`);
    });
    if (localPaths.length > 20) {
      console.log(`  ... and ${localPaths.length - 20} more`);
    }
  }

  // Output to file if requested
  if (OUTPUT_FILE) {
    const output = {
      generated: new Date().toISOString(),
      summary: {
        total: items.length,
        withIssues: allBroken.length,
        missing: missing.length,
        localPaths: localPaths.length,
        invalidUrls: invalidUrls.length,
        nonWhitelisted: nonWhitelisted.length,
        httpErrors: httpErrors.length,
      },
      items: allBroken,
    };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${OUTPUT_FILE}`);
  }

  // Suggested actions
  console.log('\n💡 Suggested Actions:');
  if (missing.length > 0) {
    console.log(`  1. Run skill to find images for ${missing.length} items without images`);
  }
  if (localPaths.length > 0) {
    console.log(`  2. Replace ${localPaths.length} local paths with valid URLs`);
  }
  if (nonWhitelisted.length > 0) {
    console.log(`  3. Either:`);
    console.log(`     a) Add domains to next.config.js remotePatterns, OR`);
    console.log(`     b) Replace with whitelisted domain images`);
  }
  if (CHECK_HTTP && httpErrors.length > 0) {
    console.log(`  4. Find replacements for ${httpErrors.length} broken URLs`);
  }

  console.log('\n✅ Validation complete!');
}

main().catch(console.error);
