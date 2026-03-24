/**
 * Seed script: Populate "Top 50 Games - All Time" list with test data
 *
 * Creates:
 * 1. Backlog items (all 96 game items already exist)
 * 2. 2 mock users + uses existing user (list owner) = 3 voters
 * 3. 3 child lists with 50 ranked items each
 * 4. ranking_activities events
 * 5. item_consensus_cache entries
 * 6. Updated selection_count on items
 */

const { Client } = require('pg');

const POOLER_URL = 'postgresql://postgres.pvfwxilvzjzzjhdcpucu:hPYJVZFK3oh5RgQ7@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
const PARENT_LIST_ID = '06261cf8-c6a1-4117-8597-114924d81718';
const OWNER_USER_ID = '4d1e9364-9f84-4a3b-996c-c584fcc81ebf'; // You - existing user

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getConsensusLevel(stdDev, totalRankings) {
  if (totalRankings < 2) return 'moderate';
  if (stdDev < 3) return 'unanimous';
  if (stdDev < 7) return 'strong';
  if (stdDev < 12) return 'moderate';
  if (stdDev < 18) return 'mixed';
  return 'controversial';
}

async function main() {
  const client = new Client({ connectionString: POOLER_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to database');

  try {
    // 1. Get all game items
    const { rows: gameItems } = await client.query(
      `SELECT id, name FROM items WHERE category = 'games' ORDER BY name`
    );
    console.log(`Found ${gameItems.length} game items`);

    // 2. Create 2 mock users
    const mockUsers = [
      { display_name: 'Alex "TopFragger" Chen', username: 'topfragger_alex' },
      { display_name: 'Sarah GameReviewer', username: 'sarah_reviews' },
    ];

    const userIds = [OWNER_USER_ID]; // Start with the real user (you)

    for (const mu of mockUsers) {
      const { rows } = await client.query(
        `INSERT INTO users (display_name, username) VALUES ($1, $2) RETURNING id`,
        [mu.display_name, mu.username]
      );
      userIds.push(rows[0].id);
      console.log(`Created mock user: ${mu.display_name} (${rows[0].id})`);
    }
    console.log(`Total voters: ${userIds.length}`);

    // 3. Create child lists for each user
    const childListIds = [];
    const userNames = ['You', 'Alex "TopFragger" Chen', 'Sarah GameReviewer'];

    for (let i = 0; i < userIds.length; i++) {
      const { rows } = await client.query(
        `INSERT INTO lists (title, category, user_id, predefined, size, time_period, parent_list_id, type)
         VALUES ($1, 'games', $2, false, 50, 'all', $3, 'top')
         RETURNING id`,
        [`Top 50 Games - ${userNames[i]}`, userIds[i], PARENT_LIST_ID]
      );
      childListIds.push(rows[0].id);
      console.log(`Created child list for ${userNames[i]}: ${rows[0].id}`);
    }

    // 4. For each user, pick 50 random games and rank them
    // Give some "popular" bias - certain iconic games are more likely to be in top positions
    const iconicGames = [
      'The Witcher 3: Wild Hunt', 'Red Dead Redemption 2', 'Elden Ring',
      'The Legend of Zelda: Breath of the Wild', 'God of War', 'Baldur\'s Gate 3',
      'Half-Life 2', 'Portal 2', 'The Last of Us Part 2', 'Minecraft',
      'GTA V', 'Mass Effect 2', 'Dark Souls', 'Bloodborne',
      'The Legend of Zelda: Ocarina of Time', 'Chrono Trigger', 'Hades',
      'Sekiro: Shadows Die Twice', 'Disco Elysium', 'Hollow Knight'
    ];

    const itemSelectionCounts = {}; // track how many lists include each item

    for (let u = 0; u < userIds.length; u++) {
      // Create a weighted selection - iconic games are always included
      const iconicIds = gameItems
        .filter(g => iconicGames.includes(g.name))
        .map(g => g.id);

      const nonIconicIds = gameItems
        .filter(g => !iconicGames.includes(g.name))
        .map(g => g.id);

      // Take all iconic games + random non-iconic to fill 50
      const remaining = 50 - iconicIds.length;
      const shuffledNonIconic = shuffle(nonIconicIds);
      const selected = [...iconicIds, ...shuffledNonIconic.slice(0, remaining)];

      // Shuffle to randomize ranking, but with bias for user 0 (you)
      let ranked;
      if (u === 0) {
        // Your ranking: iconic games tend to be higher
        const iconicSet = new Set(iconicIds);
        const yourIconic = shuffle(selected.filter(id => iconicSet.has(id)));
        const yourOther = shuffle(selected.filter(id => !iconicSet.has(id)));
        ranked = [...yourIconic, ...yourOther]; // Iconic games ranked higher
      } else {
        // Other users: fully random
        ranked = shuffle(selected);
      }

      // Insert list_items
      for (let r = 0; r < ranked.length; r++) {
        await client.query(
          `INSERT INTO list_items (list_id, item_id, ranking) VALUES ($1, $2, $3)`,
          [childListIds[u], ranked[r], r + 1]
        );

        // Track selection counts
        itemSelectionCounts[ranked[r]] = (itemSelectionCounts[ranked[r]] || 0) + 1;
      }
      console.log(`Inserted 50 ranked items for ${userNames[u]}`);
    }

    // 5. Update selection_count on items
    for (const [itemId, count] of Object.entries(itemSelectionCounts)) {
      await client.query(
        `UPDATE items SET selection_count = selection_count + $1 WHERE id = $2`,
        [count, itemId]
      );
    }
    console.log(`Updated selection_count for ${Object.keys(itemSelectionCounts).length} items`);

    // 6. Generate ranking_activities for all user actions
    let activityCount = 0;
    for (let u = 0; u < userIds.length; u++) {
      const { rows: listItems } = await client.query(
        `SELECT item_id, ranking FROM list_items WHERE list_id = $1 ORDER BY ranking`,
        [childListIds[u]]
      );

      // Simulate: each item was assigned, some were moved
      for (const li of listItems) {
        // Initial assign event
        const assignDate = new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000); // last 7 days
        await client.query(
          `INSERT INTO ranking_activities (item_id, list_id, user_id, action, position_before, position_after, list_title, created_at)
           VALUES ($1, $2, $3, 'assign', NULL, $4, 'Top 50 Games - All Time', $5)`,
          [li.item_id, childListIds[u], userIds[u], li.ranking, assignDate]
        );
        activityCount++;

        // 30% chance of a move event (re-ranking)
        if (Math.random() < 0.3) {
          const oldPos = Math.floor(Math.random() * 50) + 1;
          const moveDate = new Date(assignDate.getTime() + Math.random() * 2 * 24 * 3600 * 1000);
          await client.query(
            `INSERT INTO ranking_activities (item_id, list_id, user_id, action, position_before, position_after, list_title, created_at)
             VALUES ($1, $2, $3, 'move', $4, $5, 'Top 50 Games - All Time', $6)`,
            [li.item_id, childListIds[u], userIds[u], oldPos, li.ranking, moveDate]
          );
          activityCount++;
        }
      }
    }
    console.log(`Created ${activityCount} ranking activities`);

    // 7. Populate item_consensus_cache
    // Gather positions per item across all 3 user lists
    const { rows: allRankings } = await client.query(`
      SELECT li.item_id, li.ranking, l.id as list_id
      FROM list_items li
      JOIN lists l ON l.id = li.list_id
      WHERE l.parent_list_id = $1
    `, [PARENT_LIST_ID]);

    // Group by item
    const itemPositions = {};
    for (const r of allRankings) {
      if (!itemPositions[r.item_id]) itemPositions[r.item_id] = [];
      itemPositions[r.item_id].push(r.ranking);
    }

    let consensusCount = 0;
    for (const [itemId, positions] of Object.entries(itemPositions)) {
      const n = positions.length;
      const avg = positions.reduce((a, b) => a + b, 0) / n;
      const sorted = [...positions].sort((a, b) => a - b);
      const median = sorted[Math.floor(n / 2)];
      const variance = positions.reduce((sum, p) => sum + (p - avg) ** 2, 0) / n;
      const stdDev = Math.sqrt(variance);
      const volatility = Math.min(stdDev / 25, 1); // normalize to 0-1
      const confidence = Math.min(n / 10, 1); // scale with sample size
      const consensusLevel = getConsensusLevel(stdDev, n);

      // Build distribution
      const distribution = {};
      for (const p of positions) {
        distribution[p] = (distribution[p] || 0) + 1;
      }

      // Percentiles
      const p25 = sorted[Math.floor(n * 0.25)];
      const p50 = sorted[Math.floor(n * 0.5)];
      const p75 = sorted[Math.floor(n * 0.75)];

      await client.query(`
        INSERT INTO item_consensus_cache (item_id, category, total_rankings, average_position, median_position,
          position_std_dev, volatility, confidence, distribution, percentiles, consensus_level,
          expires_at, last_calculated)
        VALUES ($1, 'games', $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() + INTERVAL '7 days', NOW())
        ON CONFLICT (item_id, category) DO UPDATE SET
          total_rankings = EXCLUDED.total_rankings,
          average_position = EXCLUDED.average_position,
          median_position = EXCLUDED.median_position,
          position_std_dev = EXCLUDED.position_std_dev,
          volatility = EXCLUDED.volatility,
          confidence = EXCLUDED.confidence,
          distribution = EXCLUDED.distribution,
          percentiles = EXCLUDED.percentiles,
          consensus_level = EXCLUDED.consensus_level,
          expires_at = EXCLUDED.expires_at,
          last_calculated = EXCLUDED.last_calculated
      `, [
        itemId, n,
        Math.round(avg * 100) / 100,
        median,
        Math.round(stdDev * 100) / 100,
        Math.round(volatility * 100) / 100,
        Math.round(confidence * 10000) / 10000,
        JSON.stringify(distribution),
        JSON.stringify({ p25, p50, p75 }),
        consensusLevel
      ]);
      consensusCount++;
    }
    console.log(`Populated item_consensus_cache for ${consensusCount} items`);

    // 8. Update ranking_aggregates for games category
    const topItems = Object.entries(itemPositions)
      .map(([id, pos]) => ({
        item_id: id,
        rank: Math.round(pos.reduce((a, b) => a + b, 0) / pos.length),
        confidence: Math.min(pos.length / 10, 1)
      }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10);

    const controversialItems = Object.entries(itemPositions)
      .map(([id, pos]) => {
        const avg = pos.reduce((a, b) => a + b, 0) / pos.length;
        const stdDev = Math.sqrt(pos.reduce((sum, p) => sum + (p - avg) ** 2, 0) / pos.length);
        return { item_id: id, volatility: Math.round(stdDev / 25 * 100) / 100, spread: Math.round(stdDev * 100) / 100 };
      })
      .sort((a, b) => b.volatility - a.volatility)
      .slice(0, 5);

    await client.query(`
      INSERT INTO ranking_aggregates (category, total_user_rankings, overall_consensus_score,
        average_list_completion, top_items, controversial_items)
      VALUES ('games', $1, $2, $3, $4, $5)
      ON CONFLICT (category, subcategory) DO UPDATE SET
        total_user_rankings = EXCLUDED.total_user_rankings,
        overall_consensus_score = EXCLUDED.overall_consensus_score,
        average_list_completion = EXCLUDED.average_list_completion,
        top_items = EXCLUDED.top_items,
        controversial_items = EXCLUDED.controversial_items,
        last_calculated = NOW()
    `, [
      3, // 3 users
      65.0, // overall consensus score
      100.0, // all lists complete
      JSON.stringify(topItems),
      JSON.stringify(controversialItems)
    ]);
    console.log('Updated ranking_aggregates for games category');

    // 9. Update view_count on items (simulate views)
    await client.query(`
      UPDATE items SET view_count = FLOOR(RANDOM() * 500 + 50)
      WHERE category = 'games'
    `);
    console.log('Updated view_count for game items');

    // Summary
    console.log('\n=== SEED COMPLETE ===');
    console.log(`Parent list: ${PARENT_LIST_ID}`);
    console.log(`Child lists: ${childListIds.join(', ')}`);
    console.log(`Users: ${userIds.join(', ')}`);
    console.log(`Game items in backlog: ${gameItems.length}`);
    console.log(`Rankings per user: 50`);
    console.log(`Activities logged: ${activityCount}`);
    console.log(`Consensus cache entries: ${consensusCount}`);

  } finally {
    await client.end();
  }
}

main().catch(e => {
  console.error('SEED FAILED:', e.message);
  process.exit(1);
});
