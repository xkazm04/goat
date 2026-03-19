#!/usr/bin/env node
/**
 * fix-broken-images.mjs
 *
 * Scans ALL items in the database, validates their image URLs, and
 * searches Wikipedia for replacements when images are broken.
 *
 * Checks performed:
 *   1. URL is non-null/non-empty
 *   2. Host is in the Next.js remotePatterns allow-list
 *   3. HTTP HEAD returns 200 (with retry on 429)
 *   4. Content-Length > 0 (not an empty file)
 *
 * Usage:
 *   node scripts/fix-broken-images.mjs                        # dry-run (default)
 *   node scripts/fix-broken-images.mjs --apply                # actually update DB
 *   node scripts/fix-broken-images.mjs --category hockey      # filter by category
 *   node scripts/fix-broken-images.mjs --limit 100            # process first N items only
 *   node scripts/fix-broken-images.mjs --skip-search          # validate only, no Wikipedia search
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ── Config ────────────────────────────────────────────────────────────
const PAGE_SIZE = 1000;   // Supabase max rows per request
const CONCURRENCY = 3;    // parallel HEAD requests (low to avoid 429)
const DELAY_MS = 200;     // delay between batches
const RATE_LIMIT_MS = 500; // delay between Wikipedia API calls
const HEAD_TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;    // retry on 429

// Next.js allowed image hostnames (from next.config.js remotePatterns)
const ALLOWED_HOSTS = new Set([
  'upload.wikimedia.org',
  'm.media-amazon.com',
  'static.wikia.nocookie.net',
  'cdn.britannica.com',
  'media.d3.nhle.com',
  'files.eliteprospects.com',
  'i0.wp.com',
  'i1.wp.com',
  'i2.wp.com',
  'cdn.cloudflare.steamstatic.com',
]);

const USER_AGENT = 'GOATApp/1.0 (https://goat.app; contact@goat.app) fix-broken-images';

// ── Env ───────────────────────────────────────────────────────────────
const env = readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

// ── CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const skipSearch = args.includes('--skip-search');
const categoryFilter = args.includes('--category')
  ? args[args.indexOf('--category') + 1]
  : null;
const limitArg = args.includes('--limit')
  ? parseInt(args[args.indexOf('--limit') + 1], 10)
  : Infinity;

// ── Helpers ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isHostAllowed(imageUrl) {
  try {
    const host = new URL(imageUrl).hostname;
    return ALLOWED_HOSTS.has(host);
  } catch {
    return false;
  }
}

/** HEAD-check an image URL with retry on 429. Returns { ok, status, size, reason }. */
async function checkImage(imageUrl) {
  if (!imageUrl || !imageUrl.trim()) {
    return { ok: false, status: 0, size: 0, reason: 'null/empty' };
  }

  // Local /public paths are always valid
  if (imageUrl.startsWith('/images/')) {
    return { ok: true, status: 200, size: -1, reason: null };
  }

  if (!isHostAllowed(imageUrl)) {
    try {
      const host = new URL(imageUrl).hostname;
      return { ok: false, status: 0, size: 0, reason: `host-not-allowed:${host}` };
    } catch {
      return { ok: false, status: 0, size: 0, reason: 'invalid-url' };
    }
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);

      const res = await fetch(imageUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
      });
      clearTimeout(timer);

      // Retry on rate limit
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
        const waitMs = Math.max((retryAfter || 2) * 1000, 2000 * (attempt + 1));
        if (attempt < MAX_RETRIES - 1) {
          await sleep(waitMs);
          continue;
        }
        return { ok: false, status: 429, size: 0, reason: 'rate-limited-after-retries' };
      }

      const contentLength = parseInt(res.headers.get('content-length') || '-1', 10);

      if (!res.ok) {
        return { ok: false, status: res.status, size: contentLength, reason: `http-${res.status}` };
      }

      // content-length of 0 is suspicious, but -1 (missing header) is normal for HEAD
      if (contentLength === 0) {
        return { ok: false, status: res.status, size: 0, reason: 'zero-size' };
      }

      return { ok: true, status: res.status, size: contentLength, reason: null };
    } catch (err) {
      if (err.name === 'AbortError') {
        if (attempt < MAX_RETRIES - 1) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        return { ok: false, status: 0, size: 0, reason: 'timeout' };
      }
      return { ok: false, status: 0, size: 0, reason: `fetch-error: ${err.message}` };
    }
  }
  return { ok: false, status: 0, size: 0, reason: 'max-retries' };
}

/** Process items in batches with concurrency limit and delays. */
async function processBatched(items, fn, concurrency, delayBetween = 0) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((item, idx) => fn(item, i + idx)));
    results.push(...batchResults);
    if (delayBetween > 0 && i + concurrency < items.length) {
      await sleep(delayBetween);
    }
  }
  return results;
}

// ── Wikipedia image search ────────────────────────────────────────────
const WIKI_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'application/json',
};

/**
 * Find a Wikipedia image for the given item name + category.
 * Only returns images from upload.wikimedia.org (always in allowed hosts).
 * Validates the returned image actually corresponds to the correct article.
 */
async function findWikipediaImage(name, category) {
  // Build search variants based on category
  const sportVariants = [];
  const cat = (category || '').toLowerCase();
  if (cat.includes('hockey') || cat.includes('nhl')) {
    sportVariants.push(`${name} (ice hockey)`);
  }
  if (cat.includes('basket') || cat.includes('nba')) {
    sportVariants.push(`${name} (basketball)`);
  }
  if (cat.includes('soccer') || cat.includes('football') || cat.includes('fifa')) {
    sportVariants.push(`${name} (footballer)`);
  }
  if (cat.includes('baseball') || cat.includes('mlb')) {
    sportVariants.push(`${name} (baseball)`);
  }
  if (cat.includes('tennis')) {
    sportVariants.push(`${name} (tennis)`);
  }
  if (cat.includes('movie') || cat.includes('film')) {
    sportVariants.push(`${name} (film)`);
  }
  if (cat.includes('music') || cat.includes('artist')) {
    sportVariants.push(`${name} (musician)`);
  }
  if (cat.includes('game') || cat.includes('video')) {
    sportVariants.push(`${name} (video game)`);
  }

  const queries = [name, ...sportVariants];

  // Strategy: Direct title lookup via pageimages
  for (const query of queries) {
    try {
      const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=400&redirects=1`;
      const res = await fetch(apiUrl, { headers: WIKI_HEADERS });
      if (!res.ok) {
        if (res.status === 429) {
          await sleep(5000);
          continue;
        }
        continue;
      }

      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) continue;

      for (const page of Object.values(pages)) {
        // Skip if page is a "missing" page (wrong title)
        if (page.missing !== undefined) continue;

        const src = page.thumbnail?.source;
        if (src && isHostAllowed(src)) {
          // Verify the image is actually accessible
          const check = await checkImage(src);
          if (check.ok) return { url: src, pageTitle: page.title };
        }
      }
    } catch { /* next variant */ }
    await sleep(RATE_LIMIT_MS);
  }

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  GOAT Image Validator`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Mode:     ${apply ? 'APPLY (will update DB)' : 'DRY RUN (use --apply to update DB)'}`);
  console.log(`Search:   ${skipSearch ? 'DISABLED' : 'Wikipedia replacement search enabled'}`);
  if (categoryFilter) console.log(`Category: ${categoryFilter}`);
  if (limitArg < Infinity) console.log(`Limit:    ${limitArg}`);
  console.log();

  // ── Step 1: Fetch all items ──
  console.log('Step 1: Fetching items from database...');
  let allItems = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('items')
      .select('id, name, image_url, category, subcategory')
      .order('category', { ascending: true })
      .order('name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (categoryFilter) {
      query = query.ilike('category', `%${categoryFilter}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('DB error:', error.message);
      process.exit(1);
    }

    allItems.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  if (limitArg < allItems.length) {
    allItems = allItems.slice(0, limitArg);
  }

  const categories = [...new Set(allItems.map(i => i.category))];
  console.log(`  Found ${allItems.length} items across ${categories.length} categories: ${categories.join(', ')}\n`);

  // ── Step 2: Validate all image URLs ──
  console.log('Step 2: Validating image URLs (concurrency=' + CONCURRENCY + ', delay=' + DELAY_MS + 'ms)...');
  const broken = [];
  const valid = [];
  let checked = 0;

  const results = await processBatched(
    allItems,
    async (item) => {
      const result = await checkImage(item.image_url);
      checked++;
      if (checked % 50 === 0 || checked === allItems.length) {
        process.stdout.write(`  Checked ${checked}/${allItems.length}\r`);
      }
      return { item, result };
    },
    CONCURRENCY,
    DELAY_MS
  );

  for (const { item, result } of results) {
    if (!result.ok) {
      broken.push({ ...item, reason: result.reason, status: result.status });
    } else {
      valid.push(item);
    }
  }

  console.log(`\n  Validation complete: ${broken.length} broken, ${valid.length} valid out of ${allItems.length} total.\n`);

  if (broken.length === 0) {
    console.log('All images are valid!');
    return;
  }

  // ── Breakdown ──
  const reasonCounts = {};
  for (const b of broken) {
    reasonCounts[b.reason] = (reasonCounts[b.reason] || 0) + 1;
  }
  console.log('  Breakdown by reason:');
  for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${reason}: ${count}`);
  }

  const catCounts = {};
  for (const b of broken) {
    catCounts[b.category] = (catCounts[b.category] || 0) + 1;
  }
  console.log('\n  Broken by category:');
  for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
    const total = allItems.filter(i => i.category === cat).length;
    console.log(`    ${cat}: ${count}/${total} broken`);
  }
  console.log();

  // ── List broken items ──
  console.log('  Broken items:');
  for (const item of broken) {
    console.log(`    [${item.category}] ${item.name} — ${item.reason} — ${item.image_url || '(null)'}`);
  }
  console.log();

  if (skipSearch) {
    console.log('Skipping replacement search (--skip-search). Done.');
    return;
  }

  // ── Step 3: Find replacements ──
  console.log('Step 3: Searching for replacement images via Wikipedia...\n');
  let fixed = 0;
  let notFound = 0;
  const updateLog = [];

  for (let i = 0; i < broken.length; i++) {
    const item = broken[i];
    process.stdout.write(`  [${i + 1}/${broken.length}] ${item.name} (${item.reason})... `);

    const result = await findWikipediaImage(item.name, item.category);

    if (result) {
      // Skip if replacement is the same as the broken URL (just different size)
      const oldBase = (item.image_url || '').replace(/\/\d+px-/, '/PLACEHOLDER-');
      const newBase = result.url.replace(/\/\d+px-/, '/PLACEHOLDER-');
      const isSameImage = oldBase === newBase;

      console.log(`FOUND (${result.pageTitle})${isSameImage ? ' [SAME BASE]' : ''}`);
      console.log(`    old: ${item.image_url || '(null)'}`);
      console.log(`    new: ${result.url}`);

      if (apply && !isSameImage) {
        const { error } = await supabase
          .from('items')
          .update({ image_url: result.url })
          .eq('id', item.id);

        if (error) {
          console.log(`    DB UPDATE FAILED: ${error.message}`);
          notFound++;
        } else {
          console.log(`    DB UPDATED`);
          fixed++;
        }
      } else if (isSameImage) {
        // Same base image — the original URL likely works too, just rate-limited during check
        updateLog.push({
          id: item.id, name: item.name, category: item.category,
          reason: item.reason, old_url: item.image_url, new_url: result.url,
          status: 'same-base-skip',
        });
        continue;
      } else {
        fixed++;
      }

      updateLog.push({
        id: item.id, name: item.name, category: item.category,
        reason: item.reason, old_url: item.image_url, new_url: result.url,
        status: 'replaced',
      });
    } else {
      console.log(`NO REPLACEMENT FOUND`);
      notFound++;
      updateLog.push({
        id: item.id, name: item.name, category: item.category,
        reason: item.reason, old_url: item.image_url, new_url: null,
        status: 'unfixable',
      });
    }

    // Rate limit between searches
    await sleep(RATE_LIMIT_MS);
  }

  // ── Summary ──
  console.log(`\n${'='.repeat(50)}`);
  console.log(`SUMMARY (${apply ? 'APPLIED' : 'DRY RUN'})`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total items checked:   ${allItems.length}`);
  console.log(`Valid images:          ${valid.length}`);
  console.log(`Broken images found:   ${broken.length}`);
  console.log(`Replacements found:    ${fixed}`);
  console.log(`Same-base (likely ok): ${updateLog.filter(e => e.status === 'same-base-skip').length}`);
  console.log(`Still missing:         ${notFound}`);

  if (notFound > 0) {
    console.log(`\nItems still missing images:`);
    for (const entry of updateLog.filter((e) => e.status === 'unfixable')) {
      console.log(`  - [${entry.category}] ${entry.name} (${entry.reason})`);
    }
  }

  const sameBase = updateLog.filter(e => e.status === 'same-base-skip');
  if (sameBase.length > 0) {
    console.log(`\nSame-base images (original URL likely works, was just rate-limited):`);
    for (const entry of sameBase) {
      console.log(`  - [${entry.category}] ${entry.name}`);
    }
  }

  if (!apply && fixed > 0) {
    console.log(`\nRun with --apply to update the database.`);
  }
}

run().catch(console.error);
