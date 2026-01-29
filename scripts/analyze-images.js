#!/usr/bin/env node
/**
 * Analyze image URLs in the database
 * Usage: node scripts/analyze-images.js
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function main() {
  console.log('Fetching items from', API_BASE);

  const response = await fetch(`${API_BASE}/api/top/items?limit=2000`);
  const data = await response.json();
  const items = data.items || [];

  const domains = {};
  let noImage = 0, hasImage = 0;
  const sampleUrls = {};

  for (const item of items) {
    const url = item.image_url;
    if (url) {
      hasImage++;
      try {
        const domain = new URL(url).hostname;
        domains[domain] = (domains[domain] || 0) + 1;
        if (!sampleUrls[domain]) sampleUrls[domain] = url;
      } catch {
        domains['invalid'] = (domains['invalid'] || 0) + 1;
      }
    } else {
      noImage++;
    }
  }

  console.log('\n=== Image Analysis ===');
  console.log('Total items:', items.length, '(of', data.total, ')');
  console.log('With images:', hasImage);
  console.log('Without images:', noImage);

  console.log('\n=== Image Domains ===');
  Object.entries(domains)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([d, c]) => console.log(' ', d + ':', c));

  console.log('\n=== Sample URLs by Domain ===');
  Object.entries(sampleUrls).slice(0, 15).forEach(([d, u]) => {
    console.log(' ', d + ':');
    console.log('   ', u.slice(0, 150));
  });
}

main().catch(console.error);
