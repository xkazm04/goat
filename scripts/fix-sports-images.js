#!/usr/bin/env node
/**
 * Fix Sports Images Script
 *
 * Replaces non-whitelisted sports images with Wikipedia alternatives
 *
 * Usage:
 *   node scripts/fix-sports-images.js              # Dry run
 *   node scripts/fix-sports-images.js --update     # Actually update
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--update');

// Map athlete names to Wikipedia titles if different
const WIKIPEDIA_OVERRIDES = {
  // Hockey players - some need disambiguation
  'Dit Clapper': 'Dit_Clapper',
  'King Clancy': 'King_Clancy',
  'Max Bentley': 'Max_Bentley',
  'Bobby Orr': 'Bobby_Orr',
  'Brett Hull': 'Brett_Hull',
  'Chris Chelios': 'Chris_Chelios',
  'Dominik Hasek': 'Dominik_Hašek',
  'Andy Bathgate': 'Andy_Bathgate',
  'Dickie Moore': 'Dickie_Moore_(ice_hockey)',
  'Billy Smith': 'Billy_Smith_(ice_hockey)',
  'Phil Esposito': 'Phil_Esposito',
  'Jaromir Jagr': 'Jaromír_Jágr',

  // Basketball players
  'Charles Barkley': 'Charles_Barkley',
  'Kevin McHale': 'Kevin_McHale_(basketball)',
  'Scottie Pippen': 'Scottie_Pippen',
  'Allen Iverson': 'Allen_Iverson',
  'Moses Malone': 'Moses_Malone',
  'Gary Payton': 'Gary_Payton',
  'Anthony Davis': 'Anthony_Davis',
  'Kawhi Leonard': 'Kawhi_Leonard',
  'Kevin Garnett': 'Kevin_Garnett',
  'Russell Westbrook': 'Russell_Westbrook',
  'Clyde Drexler': 'Clyde_Drexler',
  'Dave DeBusschere': 'Dave_DeBusschere',
  'David Robinson': 'David_Robinson_(basketball)',
  'Dominique Wilkins': 'Dominique_Wilkins',

  // Soccer players
  'Ronaldo (Nazario)': 'Ronaldo_(Brazilian_footballer)',
  'Bobby Charlton': 'Bobby_Charlton',
  'Ryan Giggs': 'Ryan_Giggs',
  'Lothar Matthaus': 'Lothar_Matthäus',
  'Oleg Blokhin': 'Oleg_Blokhin',
  'Michel Platini': 'Michel_Platini',
  'Preben Elkjaer': 'Preben_Elkjær',
  'Daniel Passarella': 'Daniel_Passarella',
};

function athleteNameToWikipediaTitle(name) {
  if (WIKIPEDIA_OVERRIDES[name]) {
    return WIKIPEDIA_OVERRIDES[name];
  }
  // Default: replace spaces with underscores
  return name.replace(/ /g, '_');
}

async function fetchWikipediaImage(title) {
  if (!title) return null;

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.originalimage?.source || null;
  } catch (error) {
    console.error(`  Error fetching ${title}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🏃 Fix Sports Images Script');
  console.log('='.repeat(50));
  console.log('Mode:', DRY_RUN ? 'DRY RUN (no updates)' : 'UPDATE MODE');
  console.log('');

  // Fetch items with non-whitelisted domains
  console.log('📥 Fetching sports items with non-whitelisted images...');
  const response = await fetch(`${API_BASE}/api/items/validate?issue=non_whitelisted&limit=200`);
  const data = await response.json();
  const items = data.items || [];
  console.log(`   Found ${items.length} items to fix\n`);

  const results = {
    found: [],
    notFound: [],
    skipped: [],
  };

  // Process each athlete
  for (const item of items) {
    // Only process sports items
    if (item.category !== 'sports') {
      results.skipped.push({ id: item.id, name: item.name, reason: 'not sports' });
      continue;
    }

    const wikiTitle = athleteNameToWikipediaTitle(item.name);
    process.stdout.write(`🔍 ${item.name}... `);

    const imageUrl = await fetchWikipediaImage(wikiTitle);

    if (imageUrl) {
      console.log('✅ Found');
      results.found.push({
        id: item.id,
        name: item.name,
        image_url: imageUrl,
        old_url: item.image_url,
      });
    } else {
      console.log('❌ Not found');
      results.notFound.push({
        id: item.id,
        name: item.name,
        tried: wikiTitle,
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Results:');
  console.log(`   Found images: ${results.found.length}`);
  console.log(`   Not found: ${results.notFound.length}`);
  console.log(`   Skipped: ${results.skipped.length}`);

  if (results.notFound.length > 0) {
    console.log('\n❌ Athletes without Wikipedia images:');
    results.notFound.forEach(item => {
      console.log(`   - ${item.name} (tried: ${item.tried})`);
    });
  }

  // Update database if not dry run
  if (!DRY_RUN && results.found.length > 0) {
    console.log('\n📤 Updating database...');

    const updates = results.found.map(item => ({
      item_id: item.id,
      image_url: item.image_url,
    }));

    const updateResponse = await fetch(`${API_BASE}/api/items/stats`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });

    const updateResult = await updateResponse.json();
    console.log(`   ${updateResult.message}`);
  } else if (DRY_RUN && results.found.length > 0) {
    console.log('\n💡 Dry run - no updates made. Run with --update to apply changes.');
    console.log('\nSample replacements:');
    results.found.slice(0, 5).forEach(item => {
      console.log(`   ${item.name}:`);
      console.log(`     Old: ${item.old_url.slice(0, 60)}...`);
      console.log(`     New: ${item.image_url.slice(0, 60)}...`);
    });
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
