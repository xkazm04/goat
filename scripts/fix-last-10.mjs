#!/usr/bin/env node
/**
 * Final 10 items — download images to /public/images/items/ and update DB.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const env = readFileSync('.env', 'utf8');
const getEnv = (key) => { const m = env.match(new RegExp(`^${key}=(.+)$`, 'm')); return m?.[1]?.trim(); };
const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const apply = process.argv.includes('--apply');
const PUBLIC_DIR = join(process.cwd(), 'public', 'images', 'items');

const ITEMS = [
  // Sports — download from HHOF / official sites
  { name: 'Alan Hansen', category: 'sports', url: 'https://backend.liverpoolfc.com/sites/default/files/styles/lg/public/2025-03/past-players-alan-hansen-01032025_f7af5086b70b89d2e00ab36143f02d1f.webp?itok=s0iDs5qZ&width=1680', file: 'alan-hansen.webp' },
  { name: 'Doug Bentley', category: 'sports', url: 'https://www.hhof.com/images_portraits/P196401.jpg', file: 'doug-bentley.jpg' },
  { name: 'Frank Brimsek', category: 'sports', url: 'https://www.hhof.com/images_portraits/P196604.jpg', file: 'frank-brimsek.jpg' },
  { name: 'Ted Kennedy', category: 'sports', url: 'https://www.hhof.com/images_portraits/P196605.jpg', file: 'ted-kennedy.jpg' },
  // Games — download from wikipedia/en or Steam
  { name: 'Shadow of the Colossus', category: 'games', url: 'https://upload.wikimedia.org/wikipedia/en/a/a4/ShadowOfTheColossus2018.jpg', file: 'shadow-of-the-colossus.jpg' },
  { name: 'The Last of Us Part 2', category: 'games', url: 'https://upload.wikimedia.org/wikipedia/en/4/4f/TLOU_P2_Box_Art_2.png', file: 'the-last-of-us-part-2.png' },
  { name: 'Uncharted 2: Among Thieves', category: 'games', url: 'https://upload.wikimedia.org/wikipedia/en/7/7b/Uncharted_2_box_artwork.jpg', file: 'uncharted-2.jpg' },
  { name: 'Neef for speed: Underground 2', category: 'games', url: 'https://upload.wikimedia.org/wikipedia/en/1/10/Nfsu2-win-cover.jpg', file: 'nfs-underground-2.jpg' },
  { name: 'Warcraft III: Reign of Chaos', category: 'games', url: 'https://upload.wikimedia.org/wikipedia/en/6/66/WarcraftIII.jpg', file: 'warcraft-3.jpg' },
  { name: "Tony Hawk's Pro Skater 2", category: 'games', url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2395210/header.jpg', file: 'tony-hawk-2.jpg' },
];

async function run() {
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);
  if (apply) mkdirSync(PUBLIC_DIR, { recursive: true });
  let ok = 0, fail = 0;

  for (const item of ITEMS) {
    process.stdout.write(`  ${item.name}... `);
    try {
      const res = await fetch(item.url, {
        headers: { 'User-Agent': 'GOATApp/1.0 (contact@goat.app)' },
        redirect: 'follow',
      });
      if (!res.ok) { console.log(`DOWNLOAD FAILED (${res.status})`); fail++; continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) { console.log(`TOO SMALL (${buf.length})`); fail++; continue; }

      const localPath = `/images/items/${item.file}`;
      if (apply) {
        writeFileSync(join(PUBLIC_DIR, item.file), buf);
        // Update all matching rows
        const { data } = await supabase.from('items').select('id').eq('name', item.name).eq('category', item.category);
        for (const row of data || []) {
          await supabase.from('items').update({ image_url: localPath }).eq('id', row.id);
        }
      }
      console.log(`OK (${buf.length} bytes → ${localPath})`);
      ok++;
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      fail++;
    }
  }
  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  if (!apply && ok > 0) console.log('Run with --apply to save.');
}
run().catch(console.error);
