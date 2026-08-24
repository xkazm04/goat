/**
 * Fetch Wikipedia cover art images for game items that don't have images.
 *
 * Uses the Wikipedia REST API (page/summary) which returns the page's primary
 * image directly — typically the box art/cover for game articles.
 *
 * Two-step per game:
 * 1. Search for the Wikipedia page title (action API)
 * 2. Get the page summary with image (REST API)
 *
 * Usage:
 *   node db/scripts/fetch-game-images.js              # All yearly games missing images
 *   node db/scripts/fetch-game-images.js --lists-only  # Only games linked to yearly lists
 */

const { Client } = require('pg');
const https = require('https');

const POOLER_URL =
  'postgresql://postgres.pvfwxilvzjzzjhdcpucu:hPYJVZFK3oh5RgQ7@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';

const LISTS_ONLY = process.argv.includes('--lists-only');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'GOATRankingApp/1.0 (game ranking tool; contact@example.com)' } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

/**
 * Search Wikipedia for the exact page title for a game
 */
async function searchWikipediaTitle(gameName) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(gameName + ' video game')}&srlimit=1`;
    const data = await httpsGet(searchUrl);
    return data?.query?.search?.[0]?.title || null;
  } catch {
    return null;
  }
}

/**
 * Get the primary image from a Wikipedia page using the REST API
 */
async function getPageImage(pageTitle) {
  try {
    const slug = pageTitle.replace(/ /g, '_');
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
    const data = await httpsGet(url);
    // Prefer original image, fall back to thumbnail
    return data?.originalimage?.source || data?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

/**
 * Fetch cover art for a game
 */
async function fetchGameImage(gameName) {
  // Step 1: Find the Wikipedia page
  const title = await searchWikipediaTitle(gameName);
  if (!title) return null;

  // Step 2: Get the page image
  const imageUrl = await getPageImage(title);
  if (!imageUrl) return null;

  // Skip SVGs
  if (imageUrl.endsWith('.svg') || imageUrl.includes('.svg/')) return null;

  return imageUrl;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const client = new Client({
    connectionString: POOLER_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connected to database');

  let query;
  if (LISTS_ONLY) {
    query = `
      SELECT DISTINCT i.id, i.name
      FROM items i
      JOIN list_items li ON li.item_id = i.id
      JOIN lists l ON l.id = li.list_id
      WHERE l.title LIKE 'Top 10 Games of%' AND l.type = 'top'
        AND (i.image_url IS NULL OR i.image_url = '')
      ORDER BY i.name
    `;
  } else {
    query = `
      SELECT id, name FROM items
      WHERE category = 'games'
        AND item_year BETWEEN 2005 AND 2025
        AND (image_url IS NULL OR image_url = '')
      ORDER BY item_year, name
    `;
  }

  const { rows: items } = await client.query(query);
  console.log(`Items needing images: ${items.length}`);

  if (items.length === 0) {
    console.log('All items have images!');
    await client.end();
    return;
  }

  let fetched = 0;
  let failed = 0;
  const failedNames = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const url = await fetchGameImage(item.name);

    if (url) {
      await client.query('UPDATE items SET image_url = $1 WHERE id = $2', [url, item.id]);
      fetched++;
      process.stdout.write(`  [${i + 1}/${items.length}] OK: ${item.name}\n`);
    } else {
      failed++;
      failedNames.push(item.name);
      process.stdout.write(`  [${i + 1}/${items.length}] MISS: ${item.name}\n`);
    }

    // Rate limit: 500ms between items (2 API calls per item)
    if (i < items.length - 1) await sleep(500);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Images found: ${fetched}`);
  console.log(`Images missing: ${failed}`);
  if (failedNames.length > 0 && failedNames.length <= 50) {
    console.log(`\nMissing images for:`);
    failedNames.forEach((n) => console.log(`  - ${n}`));
  }

  await client.end();
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
