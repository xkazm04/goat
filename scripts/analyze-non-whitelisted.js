#!/usr/bin/env node
/**
 * Analyze non-whitelisted domains and items
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function main() {
  const response = await fetch(`${API_BASE}/api/items/validate?issue=non_whitelisted&limit=200`);
  const data = await response.json();

  // Group by domain
  const byDomain = {};
  for (const item of data.items || []) {
    const domain = item.domain || 'unknown';
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push({
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      url: item.image_url,
    });
  }

  // Sort by count
  const sorted = Object.entries(byDomain).sort((a, b) => b[1].length - a[1].length);

  console.log('=== Non-Whitelisted Domains Analysis ===\n');
  console.log('Total items:', data.items?.length || 0);
  console.log('Unique domains:', sorted.length);
  console.log('');

  for (const [domain, items] of sorted) {
    console.log(`\n${domain}: ${items.length} items`);
    console.log('-'.repeat(50));
    items.forEach(i => {
      console.log(`  - ${i.name} (${i.category}/${i.subcategory || 'n/a'})`);
      console.log(`    ID: ${i.id}`);
    });
    console.log(`  Sample URL: ${items[0].url}`);
  }

  // Output JSON for further processing
  console.log('\n\n=== JSON Data for Processing ===');
  const jsonData = sorted.map(([domain, items]) => ({
    domain,
    count: items.length,
    items: items.map(i => ({ id: i.id, name: i.name, category: i.category })),
  }));
  console.log(JSON.stringify(jsonData, null, 2));
}

main().catch(console.error);
