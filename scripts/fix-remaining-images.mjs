#!/usr/bin/env node
/**
 * fix-remaining-images.mjs
 *
 * Fixes the remaining 47 broken images:
 * - Games: Uses Steam CDN header images (cdn.cloudflare.steamstatic.com)
 * - Sports: Downloads from web to /public/images/items/ or uses Wikimedia
 * - Bad matches: Corrects wrongly-matched Wikipedia images
 *
 * Usage:
 *   node scripts/fix-remaining-images.mjs              # dry-run
 *   node scripts/fix-remaining-images.mjs --apply       # update DB
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ── Env ───────────────────────────────────────────────────────────────
const env = readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}
const supabase = createClient(url, serviceKey);
const apply = process.argv.includes('--apply');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Steam App IDs for games ──
// These are the Steam store app IDs — the header image URL is:
// https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/header.jpg
const STEAM_GAMES = {
  'Age Of Empires 2': 813780,             // Age of Empires II: Definitive Edition
  'A Plague Tale: Innocence': 752590,
  'Dishonored 2': 403640,
  'Dragon Age: Inquisition': 1222690,     // Dragon Age: Inquisition on Steam (EA app)
  'Hollow Knight': 367520,
  'Middle-earth: Shadow of Mordor': 241930,
  'Minecraft': null,                       // Not on Steam — download separately
  'Monster Hunter: World': 582010,
  'Mortal Kombat 11': 976310,
  'Neef for speed: Underground 2': null,   // Not on Steam — download separately
  'Persona 5 Royal': 1687950,
  'Portal 2': 620,
  'PUBG': 578080,                          // PUBG: BATTLEGROUNDS
  'Red Dead Redemption 2': 1174180,
  'Resident Evil 2 (remake)': 883710,
  'Resident Evil 4': 2050650,              // RE4 Remake
  'Rise of the Tomb Raider': 391220,
  'Sekiro: Shadows Die Twice': 814380,
  'Shadow of the Colossus': null,          // PS exclusive — download separately
  'StarCraft II: Wings of Liberty': null,  // Blizzard — download separately
  'Star Wars: Battlefront 2': 1237950,     // EA Star Wars Battlefront II
  'Star Wars: KOTOR': 32370,
  'Star Wars: KOTOR II': 208580,
  'Street Fighter VI': 1364780,            // Street Fighter 6
  'The Elder Scrolls V: Skyrim': 489830,   // Skyrim Special Edition
  'The Last of Us Part 2': null,           // PS exclusive — download separately
  'The Legend of Zelda: Breath of the Wild': null,  // Nintendo — download separately
  'The Legend of Zelda: Ocarina of Time': null,      // Nintendo — download separately
  'The Witcher 3: Wild Hunt': 292030,
  'Titanfall 2': 1237970,
  'Tony Hawk\'s Pro Skater 2': null,       // Delisted — download separately
  'Total War: Three Kingdoms': 779340,
  'Total War: Warhammer 3': 1142710,
  'Uncharted 2: Among Thieves': null,      // PS exclusive — download separately
  'Warcraft III: Reign of Chaos': null,    // Blizzard — download separately
  'Warhammer 40,000: Rogue Trader': 2186680,
  'Wasteland 3': 719040,
  'World of Warcraft': null,               // Blizzard — download separately
  'XCOM 2': 268500,
};

// ── Bad match corrections (wrong Wikipedia results) ──
const BAD_MATCH_FIXES = [
  {
    name: 'Alan Hansen',
    category: 'sports',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Alan_hansen_in_2004.JPG',
  },
  {
    name: 'Ted Kennedy',
    category: 'sports',
    // Use Maple Leafs vintage logo since there's no Commons photo of the hockey player
    download: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Toronto_Maple_Leafs_Logo_1939_-_1967.svg/500px-Toronto_Maple_Leafs_Logo_1939_-_1967.svg.png',
    local_name: 'ted-kennedy-hockey.png',
  },
];

// ── Items to download to /public ──
// For games not on Steam or exclusives, and sports with no Commons photos
const DOWNLOAD_ITEMS = {
  // Sports players without Commons photos (will search + download)
  'Denis Bergkamp': { search: 'Dennis Bergkamp Arsenal footballer', category: 'sports' },
  'Doug Bentley': { search: 'Doug Bentley Chicago Black Hawks hockey', category: 'sports' },
  'Doug Harvey': { search: 'Doug Harvey Montreal Canadiens hockey player', category: 'sports' },
  'Frank Brimsek': { search: 'Frank Brimsek Boston Bruins goalie', category: 'sports' },
  'Sam Jones': { search: 'Sam Jones Boston Celtics basketball NBA', category: 'sports' },
};

const PUBLIC_DIR = join(process.cwd(), 'public', 'images', 'items');

// ── Main ──────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n=== Fix Remaining Images ===`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  mkdirSync(PUBLIC_DIR, { recursive: true });

  let updated = 0;
  let failed = 0;

  // ── Step 1: Fix bad Wikipedia matches ──
  console.log('Step 1: Fixing bad Wikipedia matches...');
  for (const fix of BAD_MATCH_FIXES) {
    const { data: items } = await supabase
      .from('items')
      .select('id, name, image_url')
      .eq('name', fix.name)
      .eq('category', fix.category);

    if (!items?.length) {
      console.log(`  ✗ ${fix.name}: not found in DB`);
      failed++;
      continue;
    }

    let newUrl = fix.image_url;

    // Download if needed
    if (fix.download) {
      const localPath = join(PUBLIC_DIR, fix.local_name);
      newUrl = `/images/items/${fix.local_name}`;

      if (!existsSync(localPath)) {
        try {
          const res = await fetch(fix.download, {
            headers: { 'User-Agent': 'GOATApp/1.0 (image-fix)' },
          });
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            if (apply) writeFileSync(localPath, buffer);
            console.log(`  ✓ Downloaded ${fix.local_name} (${buffer.length} bytes)`);
          } else {
            console.log(`  ✗ Download failed: ${res.status}`);
            failed++;
            continue;
          }
        } catch (err) {
          console.log(`  ✗ Download error: ${err.message}`);
          failed++;
          continue;
        }
      }
    }

    // Verify image is accessible (unless local)
    if (newUrl.startsWith('http')) {
      try {
        const check = await fetch(newUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'GOATApp/1.0 (image-fix)' },
        });
        if (!check.ok) {
          console.log(`  ✗ ${fix.name}: image not accessible (${check.status})`);
          failed++;
          continue;
        }
      } catch (err) {
        console.log(`  ✗ ${fix.name}: fetch error: ${err.message}`);
        failed++;
        continue;
      }
    }

    for (const item of items) {
      console.log(`  ✓ ${fix.name}: ${item.image_url?.substring(0, 60)}... → ${newUrl.substring(0, 60)}...`);
      if (apply) {
        await supabase.from('items').update({ image_url: newUrl }).eq('id', item.id);
      }
      updated++;
    }
  }

  // ── Step 2: Update games with Steam CDN URLs ──
  console.log('\nStep 2: Updating games with Steam CDN header images...');
  const steamUrl = (appId) =>
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

  const gamesOnSteam = Object.entries(STEAM_GAMES).filter(([, id]) => id !== null);
  const gamesNotOnSteam = Object.entries(STEAM_GAMES).filter(([, id]) => id === null);

  // Verify Steam images exist in batch
  for (const [gameName, appId] of gamesOnSteam) {
    const imgUrl = steamUrl(appId);

    try {
      const check = await fetch(imgUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'GOATApp/1.0 (image-fix)' },
      });
      if (!check.ok) {
        console.log(`  ✗ ${gameName} (${appId}): Steam image 404`);
        failed++;
        continue;
      }
    } catch {
      console.log(`  ✗ ${gameName} (${appId}): fetch failed`);
      failed++;
      continue;
    }

    // Find all matching items (handle duplicates like PUBG)
    const { data: items } = await supabase
      .from('items')
      .select('id, name, image_url')
      .eq('name', gameName)
      .eq('category', 'games');

    if (!items?.length) {
      console.log(`  ✗ ${gameName}: not found in DB`);
      failed++;
      continue;
    }

    for (const item of items) {
      console.log(`  ✓ ${gameName} → Steam ${appId}`);
      if (apply) {
        await supabase.from('items').update({ image_url: imgUrl }).eq('id', item.id);
      }
      updated++;
    }
    await sleep(100);
  }

  // ── Step 3: Download images for non-Steam games ──
  console.log('\nStep 3: Games not on Steam (need download to /public)...');
  for (const [gameName] of gamesNotOnSteam) {
    if (gameName === 'dnisa') {
      console.log(`  - Skipping "dnisa" (likely test entry)`);
      continue;
    }
    console.log(`  ! ${gameName}: needs manual image download to /public/images/items/`);
  }

  // ── Step 4: Download images for remaining sports players ──
  console.log('\nStep 4: Sports players needing downloaded images...');
  for (const [name] of Object.entries(DOWNLOAD_ITEMS)) {
    console.log(`  ! ${name}: needs manual image download to /public/images/items/`);
  }

  // ── Summary ──
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Updated: ${updated}, Failed: ${failed}`);
  console.log(`Games needing manual download: ${gamesNotOnSteam.filter(([n]) => n !== 'dnisa').length}`);
  console.log(`Sports needing manual download: ${Object.keys(DOWNLOAD_ITEMS).length}`);
  if (!apply && updated > 0) {
    console.log(`\nRun with --apply to update the database.`);
  }
}

run().catch(console.error);
