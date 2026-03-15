/**
 * Seed Video Game Categories
 *
 * Populates Supabase with 12 video game categories, each with 100+ items.
 * Pipeline: Gemini generates titles -> IGDB provides cover art -> Wikipedia fallback -> DB upsert.
 *
 * Usage:
 *   npx tsx scripts/seed-categories.ts           # Full run
 *   npx tsx scripts/seed-categories.ts --dry-run  # Preview only
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   GEMINI_API_KEY, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
 */

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes("--dry-run");

const CATEGORIES = [
  { name: "Best RPGs of All Time", subcategory: "RPG" },
  { name: "Best FPS Games of All Time", subcategory: "FPS" },
  { name: "Best Action-Adventure Games", subcategory: "Action-Adventure" },
  { name: "Best Nintendo Games of All Time", subcategory: "Nintendo" },
  { name: "Best PlayStation Exclusives", subcategory: "PlayStation" },
  { name: "Best Open World Games", subcategory: "Open World" },
  { name: "Best Horror Games", subcategory: "Horror" },
  { name: "Best Fighting Games", subcategory: "Fighting" },
  { name: "Best Racing Games", subcategory: "Racing" },
  { name: "Best Indie Games", subcategory: "Indie" },
  { name: "Best Strategy Games", subcategory: "Strategy" },
  { name: "Best Sports Games", subcategory: "Sports" },
];

const IGDB_CONCURRENCY = 4;
const WIKI_CONCURRENCY = 6;
const HEAD_CONCURRENCY = 10;

// ---------------------------------------------------------------------------
// Env validation
// ---------------------------------------------------------------------------

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
  return val;
}

// ---------------------------------------------------------------------------
// Supabase client (service role - no cookies needed)
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Gemini: generate game titles
// ---------------------------------------------------------------------------

async function generateTitles(categoryName: string): Promise<string[]> {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const client = new GoogleGenAI({ apiKey });

  const prompt = `Generate a JSON array of exactly 120 well-known video game titles for the category "${categoryName}".
Rules:
- Use exact official game titles (e.g. "The Legend of Zelda: Breath of the Wild", not "Zelda BOTW")
- Include a mix of classic and modern games
- No duplicates
- Only include games that are widely recognized and notable
- Return ONLY a JSON array of strings, nothing else

Example format: ["Game Title 1", "Game Title 2", ...]`;

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "[]";
  try {
    const titles = JSON.parse(text) as string[];
    if (!Array.isArray(titles)) throw new Error("Not an array");
    // Deduplicate
    return Array.from(new Set(titles.map((t) => t.trim()).filter(Boolean)));
  } catch (err) {
    console.error(`  Failed to parse Gemini response for "${categoryName}":`, err);
    // Try to extract JSON array from text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const titles = JSON.parse(match[0]) as string[];
        return Array.from(new Set(titles.map((t) => t.trim()).filter(Boolean)));
      } catch {
        // fall through
      }
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// IGDB: fetch cover art
// ---------------------------------------------------------------------------

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API_BASE = "https://api.igdb.com/v4";

let igdbAccessToken: string | null = null;
let igdbTokenExpiresAt = 0;

async function getIGDBToken(): Promise<string> {
  if (igdbAccessToken && Date.now() < igdbTokenExpiresAt - 60_000) {
    return igdbAccessToken;
  }

  const clientId = requireEnv("TWITCH_CLIENT_ID");
  const clientSecret = requireEnv("TWITCH_CLIENT_SECRET");

  const resp = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!resp.ok) throw new Error(`Twitch token error: ${resp.status}`);
  const data = await resp.json();
  igdbAccessToken = data.access_token;
  igdbTokenExpiresAt = Date.now() + data.expires_in * 1000;
  return igdbAccessToken!;
}

interface IGDBSearchResult {
  id: number;
  name: string;
  cover?: { image_id: string };
}

async function igdbSearchGame(title: string): Promise<string | null> {
  const clientId = requireEnv("TWITCH_CLIENT_ID");
  const token = await getIGDBToken();

  const body = `search "${title.replace(/"/g, '\\"')}"; fields name, cover.image_id; limit 3;`;

  const resp = await fetch(`${IGDB_API_BASE}/games`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!resp.ok) {
    // Rate limited - wait and retry once
    if (resp.status === 429) {
      await delay(2000);
      const retry = await fetch(`${IGDB_API_BASE}/games`, {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
        body,
      });
      if (!retry.ok) return null;
      const results = (await retry.json()) as IGDBSearchResult[];
      return pickCover(results, title);
    }
    return null;
  }

  const results = (await resp.json()) as IGDBSearchResult[];
  return pickCover(results, title);
}

function pickCover(results: IGDBSearchResult[], title: string): string | null {
  if (!results.length) return null;

  // Prefer exact name match
  const exact = results.find(
    (r) => r.name.toLowerCase() === title.toLowerCase()
  );
  const best = exact || results[0];

  if (best.cover?.image_id) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big/${best.cover.image_id}.jpg`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Wikipedia fallback
// ---------------------------------------------------------------------------

async function fetchWikipediaImage(title: string): Promise<string | null> {
  try {
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.searchParams.set("action", "query");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("origin", "*");
    searchUrl.searchParams.set("list", "search");
    searchUrl.searchParams.set("srsearch", `${title} video game`);
    searchUrl.searchParams.set("srlimit", "1");

    const searchResp = await fetch(searchUrl.toString());
    if (!searchResp.ok) return null;

    const searchData = await searchResp.json();
    const results = searchData.query?.search;
    if (!results?.length) return null;

    const pageId = results[0].pageid;

    const pageUrl = new URL("https://en.wikipedia.org/w/api.php");
    pageUrl.searchParams.set("action", "query");
    pageUrl.searchParams.set("format", "json");
    pageUrl.searchParams.set("origin", "*");
    pageUrl.searchParams.set("pageids", pageId.toString());
    pageUrl.searchParams.set("prop", "pageimages|original");
    pageUrl.searchParams.set("pithumbsize", "500");

    const pageResp = await fetch(pageUrl.toString());
    if (!pageResp.ok) return null;

    const pageData = await pageResp.json();
    const page = pageData.query?.pages?.[pageId];
    return page?.original?.source || page?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Image validation via HEAD request
// ---------------------------------------------------------------------------

async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return resp.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Concurrency limiter
// ---------------------------------------------------------------------------

async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

interface SeedItem {
  title: string;
  imageUrl: string | null;
}

async function enrichItems(titles: string[]): Promise<SeedItem[]> {
  // Step 1: IGDB lookup (rate limited)
  console.log(`    IGDB lookup for ${titles.length} titles...`);
  const igdbResults = await withConcurrency(
    titles,
    IGDB_CONCURRENCY,
    async (title) => {
      try {
        const url = await igdbSearchGame(title);
        return { title, imageUrl: url };
      } catch {
        return { title, imageUrl: null as string | null };
      }
    }
  );

  // Step 2: Wikipedia fallback for items without IGDB cover
  const needsWiki = igdbResults.filter((r) => !r.imageUrl);
  if (needsWiki.length > 0) {
    console.log(`    Wikipedia fallback for ${needsWiki.length} items...`);
    await withConcurrency(needsWiki, WIKI_CONCURRENCY, async (item) => {
      try {
        const url = await fetchWikipediaImage(item.title);
        item.imageUrl = url;
      } catch {
        // leave null
      }
    });
  }

  // Step 3: Validate image URLs with HEAD requests
  const withImages = igdbResults.filter((r) => r.imageUrl);
  if (withImages.length > 0) {
    console.log(`    Validating ${withImages.length} image URLs...`);
    await withConcurrency(withImages, HEAD_CONCURRENCY, async (item) => {
      const valid = await validateImageUrl(item.imageUrl!);
      if (!valid) {
        item.imageUrl = null;
      }
    });
  }

  return igdbResults;
}

async function seedCategory(
  supabase: ReturnType<typeof createClient>,
  category: { name: string; subcategory: string }
) {
  const tag = `[${category.name}]`;
  console.log(`\n${tag} Generating titles...`);

  // Step 1: Generate titles with Gemini
  const titles = await generateTitles(category.name);
  if (titles.length === 0) {
    console.log(`${tag} Gemini returned no titles -- skipping`);
    return { saved: 0, skipped: 0, total: 0 };
  }
  console.log(`${tag} Got ${titles.length} titles`);

  if (DRY_RUN) {
    console.log(`${tag} [DRY RUN] Would enrich and save ${titles.length} items`);
    console.log(`${tag} [DRY RUN] Sample titles: ${titles.slice(0, 5).join(", ")}`);
    return { saved: 0, skipped: 0, total: titles.length };
  }

  // Step 2: Enrich with images
  console.log(`${tag} Enriching ${titles.length} items...`);
  const items = await enrichItems(titles);

  // Step 3: Upsert category group
  const groupSlug = category.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data: groupData, error: groupError } = await supabase
    .from("item_groups")
    .upsert(
      {
        name: category.name,
        category: "Games",
        subcategory: category.subcategory,
        description: `Top ${category.name.replace("Best ", "")} — ranked by the community`,
        slug: groupSlug,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (groupError) {
    // Try to fetch existing
    const { data: existing } = await supabase
      .from("item_groups")
      .select("id")
      .eq("slug", groupSlug)
      .single();

    if (!existing) {
      console.error(`${tag} Failed to upsert group:`, groupError.message);
      return { saved: 0, skipped: 0, total: titles.length };
    }
    var groupId = existing.id;
  } else {
    var groupId = groupData.id;
  }

  // Step 4: Upsert items
  const itemRows = items.map((item) => ({
    name: item.title,
    category: "Games",
    group_id: groupId,
    description: null as string | null,
    image_url: item.imageUrl,
    reference_url: null as string | null,
  }));

  // Insert in batches of 50 to avoid payload limits
  let saved = 0;
  let skipped = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < itemRows.length; i += BATCH_SIZE) {
    const batch = itemRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("items")
      .upsert(batch, { onConflict: "name,group_id", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error(`${tag} Batch upsert error:`, error.message);
      skipped += batch.length;
    } else {
      saved += data?.length ?? batch.length;
    }
  }

  skipped = items.length - saved;
  console.log(
    `${tag} Saved ${saved}/${items.length} items (${skipped} skipped)`
  );

  return { saved, skipped, total: items.length };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Video Game Category Seed Script ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`Categories: ${CATEGORIES.length}`);
  console.log("");

  if (DRY_RUN) {
    console.log("Planned categories:");
    for (const cat of CATEGORIES) {
      console.log(`  - ${cat.name} (${cat.subcategory})`);
    }
    console.log("");
    console.log("Pipeline per category:");
    console.log("  1. Gemini generates 120 game titles");
    console.log("  2. IGDB lookup for cover art (4 concurrent)");
    console.log("  3. Wikipedia fallback for missing covers (6 concurrent)");
    console.log("  4. HEAD validation of image URLs (10 concurrent)");
    console.log("  5. Upsert to Supabase (idempotent)");

    // Validate env vars exist
    const envVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GEMINI_API_KEY",
      "TWITCH_CLIENT_ID",
      "TWITCH_CLIENT_SECRET",
    ];
    console.log("\nEnvironment check:");
    let allPresent = true;
    for (const v of envVars) {
      const present = !!process.env[v];
      console.log(`  ${present ? "OK" : "MISSING"}: ${v}`);
      if (!present) allPresent = false;
    }

    if (!allPresent) {
      console.log(
        "\nSome env vars are missing. Full run will fail without them."
      );
    }
    return;
  }

  const supabase = getSupabase();

  const summary: Array<{ name: string; saved: number; skipped: number; total: number }> = [];

  for (const cat of CATEGORIES) {
    try {
      const result = await seedCategory(supabase, cat);
      summary.push({ name: cat.name, ...result });
    } catch (err) {
      console.error(`[${cat.name}] ERROR:`, err instanceof Error ? err.message : err);
      summary.push({ name: cat.name, saved: 0, skipped: 0, total: 0 });
    }

    // Small delay between categories to avoid rate limits
    await delay(1000);
  }

  // Print summary
  console.log("\n\n=== SEED SUMMARY ===");
  let totalSaved = 0;
  let totalSkipped = 0;
  for (const s of summary) {
    console.log(
      `  ${s.name}: ${s.saved} saved, ${s.skipped} skipped (${s.total} generated)`
    );
    totalSaved += s.saved;
    totalSkipped += s.skipped;
  }
  console.log(`\n  TOTAL: ${totalSaved} items saved, ${totalSkipped} skipped`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
