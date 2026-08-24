#!/usr/bin/env node
/**
 * fix-final-images.mjs
 *
 * Final pass: fixes remaining broken images and corrects bad matches.
 *
 * - Sports players: Wikimedia Commons URLs (verified accessible)
 * - Non-Steam games: Download cover art to /public/images/items/
 * - Bad matches: Correct wrongly-matched Wikipedia images
 *
 * Usage:
 *   node scripts/fix-final-images.mjs              # dry-run
 *   node scripts/fix-final-images.mjs --apply       # update DB + download images
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const env = readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const apply = process.argv.includes('--apply');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PUBLIC_DIR = join(process.cwd(), 'public', 'images', 'items');

// ── All remaining fixes ──
// For remote URLs: set `image_url` directly
// For downloads: set `download` (source URL) + `local_name` (saved as /images/items/{local_name})
const FIXES = [
  // ── Bad match corrections ──
  // Ted Kennedy: was matched to US Senator — use hockey team photo
  {
    name: 'Ted Kennedy',
    category: 'sports',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Toronto_Maple_Leafs_Players_1946.jpg',
  },
  // Alan Hansen: Wikipedia page image is wrong (Kees Kist) — no correct Commons photo exists
  // Set to null to clear the bad image; user can add manually
  {
    name: 'Alan Hansen',
    category: 'sports',
    image_url: null,
    skip_verify: true,
  },

  // ── Sports players found via Wikipedia API ──
  {
    name: 'Denis Bergkamp',
    category: 'sports',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Dennis_Bergkamp_2014_%28cropped%29.jpg',
  },
  {
    name: 'Sam Jones',
    category: 'sports',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Sam_Jones%2C_Boston_Celtics%2C_1969.jpg',
  },
  {
    name: 'Doug Harvey',
    category: 'sports',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Doug_Harvey_Rangers.jpg',
  },
  // Doug Bentley & Frank Brimsek: No Commons photos exist for these historical players
  // Set to null to clear broken URLs
  {
    name: 'Doug Bentley',
    category: 'sports',
    image_url: null,
    skip_verify: true,
  },
  {
    name: 'Frank Brimsek',
    category: 'sports',
    image_url: null,
    skip_verify: true,
  },

  // ── Non-Steam games — download cover art to /public ──
  {
    name: 'Minecraft',
    category: 'games',
    download: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1672970/header.jpg',
    local_name: 'minecraft.jpg',
  },
  // Use Commons logo SVGs for PS/Nintendo exclusives (no cover art on Commons)
  {
    name: 'Shadow of the Colossus',
    category: 'games',
    image_url: null,
    skip_verify: true,
  },
  {
    name: 'The Last of Us Part 2',
    category: 'games',
    image_url: null,
    skip_verify: true,
  },
  {
    name: 'The Legend of Zelda: Breath of the Wild',
    category: 'games',
    download: 'https://upload.wikimedia.org/wikipedia/en/c/c6/The_Legend_of_Zelda_Breath_of_the_Wild.jpg',
    local_name: 'zelda-botw.jpg',
  },
  {
    name: 'The Legend of Zelda: Ocarina of Time',
    category: 'games',
    download: 'https://upload.wikimedia.org/wikipedia/en/5/57/The_Legend_of_Zelda_Ocarina_of_Time.jpg',
    local_name: 'zelda-oot.jpg',
  },
  {
    name: 'Uncharted 2: Among Thieves',
    category: 'games',
    image_url: null,
    skip_verify: true,
  },
  {
    name: 'Neef for speed: Underground 2',
    category: 'games',
    image_url: null,
    skip_verify: true,
  },
  {
    name: 'StarCraft II: Wings of Liberty',
    category: 'games',
    download: 'https://upload.wikimedia.org/wikipedia/en/2/20/StarCraft_II_-_Box_Art.jpg',
    local_name: 'starcraft-2.jpg',
  },
  {
    name: 'Warcraft III: Reign of Chaos',
    category: 'games',
    image_url: null,
    skip_verify: true,
  },
  {
    name: 'World of Warcraft',
    category: 'games',
    download: 'https://upload.wikimedia.org/wikipedia/en/6/65/World_of_Warcraft.png',
    local_name: 'world-of-warcraft.png',
  },
  {
    name: 'Tony Hawk\'s Pro Skater 2',
    category: 'games',
    image_url: null,
    skip_verify: true,
  },
];

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GOATApp/1.0 (contact@goat.app)' },
      redirect: 'follow',
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return { ok: false, reason: 'too-small' };

    if (apply) writeFileSync(destPath, buffer);
    return { ok: true, size: buffer.length };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function run() {
  console.log(`\n=== Final Image Fixes ===`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  if (apply) mkdirSync(PUBLIC_DIR, { recursive: true });

  let updated = 0;
  let failed = 0;
  let downloaded = 0;

  for (const fix of FIXES) {
    process.stdout.write(`  ${fix.name} [${fix.category}]... `);

    // Find item(s) in DB
    const { data: items } = await supabase
      .from('items')
      .select('id, name, image_url')
      .eq('name', fix.name)
      .eq('category', fix.category);

    if (!items?.length) {
      console.log('NOT FOUND IN DB');
      failed++;
      continue;
    }

    let newUrl;

    if (fix.download) {
      // Download to /public
      const destPath = join(PUBLIC_DIR, fix.local_name);
      const result = await downloadImage(fix.download, destPath);

      if (!result.ok && fix.alt_download) {
        console.log(`primary failed (${result.reason}), trying alt... `);
        const altResult = await downloadImage(fix.alt_download, destPath);
        if (altResult.ok) {
          newUrl = `/images/items/${fix.local_name}`;
          downloaded++;
          console.log(`DOWNLOADED (alt, ${altResult.size} bytes)`);
        } else {
          console.log(`BOTH FAILED (${result.reason} / ${altResult.reason})`);
          failed++;
          continue;
        }
      } else if (result.ok) {
        newUrl = `/images/items/${fix.local_name}`;
        downloaded++;
        console.log(`DOWNLOADED (${result.size} bytes)`);
      } else {
        console.log(`DOWNLOAD FAILED (${result.reason})`);
        failed++;
        continue;
      }
    } else if (fix.image_url !== undefined) {
      if (fix.image_url === null) {
        // Clear broken URL
        newUrl = null;
        console.log('CLEARED (no replacement available)');
      } else if (fix.skip_verify) {
        newUrl = fix.image_url;
        console.log('SET (skip verify)');
      } else {
        // Verify remote URL
        try {
          const check = await fetch(fix.image_url, {
            method: 'HEAD',
            headers: { 'User-Agent': 'GOATApp/1.0 (contact@goat.app)' },
          });
          if (!check.ok) {
            console.log(`IMAGE NOT ACCESSIBLE (${check.status})`);
            failed++;
            continue;
          }
        } catch (err) {
          console.log(`FETCH ERROR (${err.message})`);
          failed++;
          continue;
        }
        newUrl = fix.image_url;
        console.log('VERIFIED');
      }
    }

    // Update DB
    for (const item of items) {
      if (apply) {
        await supabase.from('items').update({ image_url: newUrl }).eq('id', item.id);
      }
      updated++;
    }
    await sleep(200);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`SUMMARY (${apply ? 'APPLIED' : 'DRY RUN'})`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Updated: ${updated}`);
  console.log(`Downloaded to /public: ${downloaded}`);
  console.log(`Failed: ${failed}`);

  if (!apply && updated > 0) {
    console.log(`\nRun with --apply to update the database and download images.`);
  }
}

run().catch(console.error);
