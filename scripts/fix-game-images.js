#!/usr/bin/env node
/**
 * Fix Game Images Script
 *
 * Fetches Wikipedia images for games with local paths
 * and updates them in the database.
 *
 * Usage:
 *   node scripts/fix-game-images.js              # Dry run (no updates)
 *   node scripts/fix-game-images.js --update     # Actually update database
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--update');

// Map game names to Wikipedia article titles
// Some games need special handling
const WIKIPEDIA_OVERRIDES = {
  'GTA: San Andreas': 'Grand_Theft_Auto:_San_Andreas',
  'GTA V': 'Grand_Theft_Auto_V',
  'Counter Strike 2': 'Counter-Strike_2',
  'It takes Two': 'It_Takes_Two_(video_game)',
  'Command & Conquer: Red Alert 2': 'Command_&_Conquer:_Red_Alert_2',
  'Apex Legends': 'Apex_Legends',
  'Fable': 'Fable_(2004_video_game)',
  'God of War': 'God_of_War_(2018_video_game)',
  'Mafia': 'Mafia_(video_game)',
  'Halo 2': 'Halo_2',
  'Dark Souls': 'Dark_Souls_(video_game)',
  'Fortnite': 'Fortnite',  // Main article, no image - will need manual
  'Expedition 33': null, // Too new, might not have Wikipedia page
};

function gameNameToWikipediaTitle(name) {
  // Check overrides first
  if (WIKIPEDIA_OVERRIDES.hasOwnProperty(name)) {
    return WIKIPEDIA_OVERRIDES[name];
  }

  // Default: replace spaces with underscores, handle common patterns
  let title = name
    .replace(/:/g, ':')
    .replace(/ /g, '_');

  return title;
}

async function fetchWikipediaImage(title) {
  if (!title) return null;

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const response = await fetch(url);

    if (!response.ok) {
      // Try with (video_game) suffix
      const altUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title + '_(video_game)')}`;
      const altResponse = await fetch(altUrl);
      if (!altResponse.ok) return null;
      const altData = await altResponse.json();
      return altData.originalimage?.source || null;
    }

    const data = await response.json();
    return data.originalimage?.source || null;
  } catch (error) {
    console.error(`  Error fetching ${title}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🎮 Fix Game Images Script');
  console.log('='.repeat(50));
  console.log('Mode:', DRY_RUN ? 'DRY RUN (no updates)' : 'UPDATE MODE');
  console.log('');

  // Fetch items with local paths
  console.log('📥 Fetching games with local paths...');
  const response = await fetch(`${API_BASE}/api/items/validate?issue=local_path&limit=200`);
  const data = await response.json();
  const items = data.items || [];
  console.log(`   Found ${items.length} games to fix\n`);

  const results = {
    found: [],
    notFound: [],
  };

  // Process each game
  for (const item of items) {
    const wikiTitle = gameNameToWikipediaTitle(item.name);
    process.stdout.write(`🔍 ${item.name}... `);

    const imageUrl = await fetchWikipediaImage(wikiTitle);

    if (imageUrl) {
      console.log('✅ Found');
      results.found.push({
        id: item.id,
        name: item.name,
        image_url: imageUrl,
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

  if (results.notFound.length > 0) {
    console.log('\n❌ Games without Wikipedia images:');
    results.notFound.forEach(item => {
      console.log(`   - ${item.name} (tried: ${item.tried || 'skipped'})`);
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
    console.log('\nSample URLs found:');
    results.found.slice(0, 5).forEach(item => {
      console.log(`   ${item.name}:`);
      console.log(`   ${item.image_url.slice(0, 100)}...`);
    });
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
