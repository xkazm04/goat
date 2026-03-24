/**
 * Seed script: Populate "Top 10 Games of <Year>" lists for 2005-2025
 *
 * Creates:
 * 1. ~630 game items (30 per year) with item_year set
 * 2. 21 parent lists ("Top 10 Games of YYYY"), one per year
 * 3. list_items linking top 10 games to each list (for thumbnails + default ranking)
 * 4. Fetches Wikipedia images for all new items (with --with-images flag)
 *
 * Usage:
 *   node db/scripts/seed-yearly-games.js              # Insert data only
 *   node db/scripts/seed-yearly-games.js --with-images # Insert data + fetch images
 */

const { Client } = require('pg');
const https = require('https');

const POOLER_URL =
  'postgresql://postgres.pvfwxilvzjzzjhdcpucu:hPYJVZFK3oh5RgQ7@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
const OWNER_USER_ID = '4d1e9364-9f84-4a3b-996c-c584fcc81ebf';

const WITH_IMAGES = process.argv.includes('--with-images');

// ---------------------------------------------------------------------------
// GAME DATA: 30 notable games per year (2005–2025)
// Order within each year = rough quality/impact ranking (top 10 become default list)
// ---------------------------------------------------------------------------
const GAMES_BY_YEAR = {
  2005: [
    'Resident Evil 4',
    'God of War',
    'Shadow of the Colossus',
    'Guitar Hero',
    'Civilization IV',
    'Psychonauts',
    'Battlefield 2',
    'Call of Duty 2',
    'Star Wars: Battlefront II',
    'Devil May Cry 3',
    'Kingdom Hearts II',
    'Fire Emblem: Path of Radiance',
    'Nintendogs',
    'Mario Kart DS',
    'Forza Motorsport',
    'Tom Clancy\'s Splinter Cell: Chaos Theory',
    'F.E.A.R.',
    'Age of Empires III',
    'Jade Empire',
    'Brothers in Arms: Road to Hill 30',
    'Destroy All Humans!',
    'Killer7',
    'Lego Star Wars: The Video Game',
    'Fahrenheit',
    'Advance Wars: Dual Strike',
    'Phoenix Wright: Ace Attorney',
    'TimeSplitters: Future Perfect',
    'SWAT 4',
    'Dungeon Siege II',
    'Battalion Wars',
  ],
  2006: [
    'The Elder Scrolls IV: Oblivion',
    'Gears of War',
    'The Legend of Zelda: Twilight Princess',
    'Final Fantasy XII',
    'Okami',
    'Company of Heroes',
    'Bully',
    'Dead Rising',
    'Wii Sports',
    'Guitar Hero II',
    'Rainbow Six: Vegas',
    'Saints Row',
    'Hitman: Blood Money',
    'New Super Mario Bros.',
    'Viva Pinata',
    'Medieval II: Total War',
    'Titan Quest',
    'LocoRoco',
    'Marvel: Ultimate Alliance',
    'Prey',
    'Condemned: Criminal Origins',
    'Just Cause',
    'Gothic 3',
    'Test Drive Unlimited',
    'Brain Age',
    'Trauma Center: Under the Knife',
    'Chromehounds',
    'Dark Messiah of Might and Magic',
    'Lego Star Wars II',
    'Excite Truck',
  ],
  2007: [
    'BioShock',
    'Call of Duty 4: Modern Warfare',
    'Portal',
    'Super Mario Galaxy',
    'Halo 3',
    'Mass Effect',
    'The Witcher',
    'Assassin\'s Creed',
    'Uncharted: Drake\'s Fortune',
    'Team Fortress 2',
    'Crysis',
    'Rock Band',
    'God of War II',
    'Ratchet & Clank Future: Tools of Destruction',
    'Metroid Prime 3: Corruption',
    'Skate',
    'S.T.A.L.K.E.R.: Shadow of Chernobyl',
    'Supreme Commander',
    'Forza Motorsport 2',
    'Virtua Fighter 5',
    'Folklore',
    'Heavenly Sword',
    'Eternal Sonata',
    'The Legend of Zelda: Phantom Hourglass',
    'Command & Conquer 3: Tiberium Wars',
    'World in Conflict',
    'Persona 3',
    'Peggle',
    'Blue Dragon',
    'Puzzle Quest',
  ],
  2008: [
    'Grand Theft Auto IV',
    'Fallout 3',
    'Metal Gear Solid 4: Guns of the Patriots',
    'Left 4 Dead',
    'Dead Space',
    'LittleBigPlanet',
    'Super Smash Bros. Brawl',
    'Burnout Paradise',
    'Gears of War 2',
    'Braid',
    'Fable II',
    'Valkyria Chronicles',
    'Rock Band 2',
    'Mario Kart Wii',
    'Prince of Persia',
    'Mirror\'s Edge',
    'Far Cry 2',
    'World of Goo',
    'Castle Crashers',
    'Saints Row 2',
    'Resistance 2',
    'No More Heroes',
    'Persona 4',
    'Lost Odyssey',
    'Tales of Vesperia',
    'Star Wars: The Force Unleashed',
    'Spore',
    'Wii Fit',
    'Advance Wars: Days of Ruin',
    'Professor Layton and the Curious Village',
  ],
  2009: [
    'Uncharted 2: Among Thieves',
    'Batman: Arkham Asylum',
    'Assassin\'s Creed II',
    'Call of Duty: Modern Warfare 2',
    'Dragon Age: Origins',
    'Left 4 Dead 2',
    'Street Fighter IV',
    'Demon\'s Souls',
    'Borderlands',
    'Forza Motorsport 3',
    'InFamous',
    'New Super Mario Bros. Wii',
    'Bayonetta',
    'Resident Evil 5',
    'Killzone 2',
    'Plants vs. Zombies',
    'Torchlight',
    'Red Faction: Guerrilla',
    'Ratchet & Clank Future: A Crack in Time',
    'Halo 3: ODST',
    'Wii Sports Resort',
    'Professor Layton and the Diabolical Box',
    'Punch-Out!!',
    'Flower',
    'Empire: Total War',
    'Trials HD',
    'Shadow Complex',
    'The Beatles: Rock Band',
    'Tropico 3',
    'Scribblenauts',
  ],
  2010: [
    'Mass Effect 2',
    'Red Dead Redemption',
    'Super Mario Galaxy 2',
    'God of War III',
    'Halo: Reach',
    'StarCraft II: Wings of Liberty',
    'Heavy Rain',
    'Limbo',
    'Civilization V',
    'Call of Duty: Black Ops',
    'Assassin\'s Creed: Brotherhood',
    'BioShock 2',
    'Fallout: New Vegas',
    'Need for Speed: Hot Pursuit',
    'Rock Band 3',
    'Super Meat Boy',
    'Alan Wake',
    'Donkey Kong Country Returns',
    'Just Cause 2',
    'Vanquish',
    'NBA 2K11',
    'Pac-Man Championship Edition DX',
    'Amnesia: The Dark Descent',
    'Metro 2033',
    'Darksiders',
    'Lara Croft and the Guardian of Light',
    'Dead Rising 2',
    'Bayonetta',
    'Enslaved: Odyssey to the West',
    'Scott Pilgrim vs. the World: The Game',
  ],
  2011: [
    'The Elder Scrolls V: Skyrim',
    'Dark Souls',
    'Portal 2',
    'Batman: Arkham City',
    'Uncharted 3: Drake\'s Deception',
    'The Witcher 2: Assassins of Kings',
    'Deus Ex: Human Revolution',
    'Bastion',
    'L.A. Noire',
    'The Legend of Zelda: Skyward Sword',
    'Minecraft',
    'Gears of War 3',
    'Rayman Origins',
    'Dead Space 2',
    'LittleBigPlanet 2',
    'Battlefield 3',
    'Mortal Kombat',
    'Saints Row: The Third',
    'InFamous 2',
    'Forza Motorsport 4',
    'Total War: Shogun 2',
    'Crysis 2',
    'Catherine',
    'Terraria',
    'The Binding of Isaac',
    'Bulletstorm',
    'Dragon Age II',
    'Resistance 3',
    'Shadows of the Damned',
    'Alice: Madness Returns',
  ],
  2012: [
    'Mass Effect 3',
    'Dishonored',
    'The Walking Dead',
    'Journey',
    'Far Cry 3',
    'XCOM: Enemy Unknown',
    'Borderlands 2',
    'Assassin\'s Creed III',
    'Halo 4',
    'Max Payne 3',
    'Spec Ops: The Line',
    'Diablo III',
    'Guild Wars 2',
    'Hotline Miami',
    'FTL: Faster Than Light',
    'Mark of the Ninja',
    'Persona 4 Golden',
    'Torchlight II',
    'Fez',
    'Trials Evolution',
    'Forza Horizon',
    'Need for Speed: Most Wanted',
    'Sleeping Dogs',
    'Dragon\'s Dogma',
    'Binary Domain',
    'Twisted Metal',
    'SSX',
    'Kid Icarus: Uprising',
    'Lollipop Chainsaw',
    'ZombiU',
  ],
  2013: [
    'The Last of Us',
    'Grand Theft Auto V',
    'BioShock Infinite',
    'Tomb Raider',
    'Fire Emblem: Awakening',
    'Super Mario 3D World',
    'The Legend of Zelda: A Link Between Worlds',
    'Brothers: A Tale of Two Sons',
    'Gone Home',
    'Papers, Please',
    'Assassin\'s Creed IV: Black Flag',
    'Ni no Kuni: Wrath of the White Witch',
    'Rayman Legends',
    'Pikmin 3',
    'Pokemon X and Y',
    'Don\'t Starve',
    'Tearaway',
    'Metro: Last Light',
    'Rogue Legacy',
    'The Stanley Parable',
    'The Wonderful 101',
    'DmC: Devil May Cry',
    'Dead Rising 3',
    'Resogun',
    'Battlefield 4',
    'Saints Row IV',
    'Splinter Cell: Blacklist',
    'State of Decay',
    'Killer Instinct',
    'The Swapper',
  ],
  2014: [
    'Dark Souls II',
    'Dragon Age: Inquisition',
    'Middle-earth: Shadow of Mordor',
    'Bayonetta 2',
    'Mario Kart 8',
    'Super Smash Bros. for Wii U',
    'Shovel Knight',
    'Divinity: Original Sin',
    'Alien: Isolation',
    'Wolfenstein: The New Order',
    'Far Cry 4',
    'Destiny',
    'The Talos Principle',
    'Titanfall',
    'South Park: The Stick of Truth',
    'Hearthstone',
    'Transistor',
    'InFamous: Second Son',
    'This War of Mine',
    'Sunset Overdrive',
    'Forza Horizon 2',
    'The Banner Saga',
    'Monument Valley',
    'The Evil Within',
    'Danganronpa: Trigger Happy Havoc',
    'Valiant Hearts: The Great War',
    'The Wolf Among Us',
    'Bravely Default',
    'Plants vs. Zombies: Garden Warfare',
    'Thief',
  ],
  2015: [
    'The Witcher 3: Wild Hunt',
    'Bloodborne',
    'Metal Gear Solid V: The Phantom Pain',
    'Fallout 4',
    'Undertale',
    'Batman: Arkham Knight',
    'Ori and the Blind Forest',
    'Rocket League',
    'Super Mario Maker',
    'Splatoon',
    'Life is Strange',
    'Pillars of Eternity',
    'Rise of the Tomb Raider',
    'Halo 5: Guardians',
    'Until Dawn',
    'Dying Light',
    'Xenoblade Chronicles X',
    'Hotline Miami 2: Wrong Number',
    'SOMA',
    'Her Story',
    'Everybody\'s Gone to the Rapture',
    'Tales from the Borderlands',
    'Just Cause 3',
    'The Beginner\'s Guide',
    'Axiom Verge',
    'Mortal Kombat X',
    'Kerbal Space Program',
    'Cities: Skylines',
    'Crypt of the NecroDancer',
    'Monster Hunter 4 Ultimate',
  ],
  2016: [
    'Overwatch',
    'Uncharted 4: A Thief\'s End',
    'Dark Souls III',
    'Doom',
    'Inside',
    'The Witness',
    'Stardew Valley',
    'The Last Guardian',
    'Final Fantasy XV',
    'Titanfall 2',
    'Dishonored 2',
    'Forza Horizon 3',
    'XCOM 2',
    'Civilization VI',
    'Hitman',
    'Ratchet & Clank',
    'Fire Emblem Fates',
    'Battlefield 1',
    'Firewatch',
    'Hyper Light Drifter',
    'Superhot',
    'Thumper',
    'Oxenfree',
    'Owlboy',
    'Furi',
    'Watch Dogs 2',
    'Deus Ex: Mankind Divided',
    'Quantum Break',
    'Pokemon Sun and Moon',
    'Mafia III',
  ],
  2017: [
    'The Legend of Zelda: Breath of the Wild',
    'Super Mario Odyssey',
    'Horizon Zero Dawn',
    'Persona 5',
    'NieR: Automata',
    'Cuphead',
    'Hollow Knight',
    'Divinity: Original Sin II',
    'Resident Evil 7: Biohazard',
    'What Remains of Edith Finch',
    'Wolfenstein II: The New Colossus',
    'Prey',
    'Splatoon 2',
    'Destiny 2',
    'PlayerUnknown\'s Battlegrounds',
    'Mario + Rabbids Kingdom Battle',
    'Nioh',
    'Uncharted: The Lost Legacy',
    'Assassin\'s Creed Origins',
    'Night in the Woods',
    'Pyre',
    'Hellblade: Senua\'s Sacrifice',
    'Middle-earth: Shadow of War',
    'Xenoblade Chronicles 2',
    'Yakuza 0',
    'Gravity Rush 2',
    'SteamWorld Dig 2',
    'Fire Emblem Echoes: Shadows of Valentia',
    'Sonic Mania',
    'Nidhogg 2',
  ],
  2018: [
    'God of War',
    'Red Dead Redemption 2',
    'Celeste',
    'Marvel\'s Spider-Man',
    'Super Smash Bros. Ultimate',
    'Monster Hunter: World',
    'Forza Horizon 4',
    'Tetris Effect',
    'Return of the Obra Dinn',
    'Into the Breach',
    'Assassin\'s Creed Odyssey',
    'Dead Cells',
    'Dragon Ball FighterZ',
    'Subnautica',
    'Far Cry 5',
    'Astro Bot Rescue Mission',
    'Detroit: Become Human',
    'Shadow of the Colossus Remake',
    'Octopath Traveler',
    'Hitman 2',
    'Yakuza 6: The Song of Life',
    'Mega Man 11',
    'Florence',
    'Donut County',
    'Soulcalibur VI',
    'Pillars of Eternity II: Deadfire',
    'Valkyria Chronicles 4',
    'Gris',
    'Ni no Kuni II: Revenant Kingdom',
    'A Way Out',
  ],
  2019: [
    'Sekiro: Shadows Die Twice',
    'Resident Evil 2 Remake',
    'Death Stranding',
    'Fire Emblem: Three Houses',
    'Control',
    'Disco Elysium',
    'Outer Wilds',
    'The Outer Worlds',
    'Devil May Cry 5',
    'Apex Legends',
    'Star Wars Jedi: Fallen Order',
    'Baba Is You',
    'Luigi\'s Mansion 3',
    'A Plague Tale: Innocence',
    'Untitled Goose Game',
    'Astral Chain',
    'Sayonara Wild Hearts',
    'Katana Zero',
    'Bloodstained: Ritual of the Night',
    'Mortal Kombat 11',
    'Borderlands 3',
    'Kingdom Hearts III',
    'Gears 5',
    'Total War: Three Kingdoms',
    'Pokemon Sword and Shield',
    'Ring Fit Adventure',
    'Call of Duty: Modern Warfare',
    'The Legend of Zelda: Link\'s Awakening Remake',
    'Judgment',
    'Cadence of Hyrule',
  ],
  2020: [
    'The Last of Us Part II',
    'Hades',
    'Ghost of Tsushima',
    'Final Fantasy VII Remake',
    'Animal Crossing: New Horizons',
    'Doom Eternal',
    'Half-Life: Alyx',
    'Ori and the Will of the Wisps',
    'Persona 5 Royal',
    'Yakuza: Like a Dragon',
    'Crusader Kings III',
    'Microsoft Flight Simulator',
    'Streets of Rage 4',
    'Tony Hawk\'s Pro Skater 1 + 2',
    'Spiritfarer',
    '13 Sentinels: Aegis Rim',
    'Fall Guys: Ultimate Knockout',
    'Genshin Impact',
    'Demon\'s Souls Remake',
    'Spider-Man: Miles Morales',
    'Astro\'s Playroom',
    'Wasteland 3',
    'Spelunky 2',
    'Deep Rock Galactic',
    'Immortals Fenyx Rising',
    'Risk of Rain 2',
    'Carrion',
    'Desperados III',
    'Kentucky Route Zero',
    'Bugsnax',
  ],
  2021: [
    'Metroid Dread',
    'Returnal',
    'Deathloop',
    'Ratchet & Clank: Rift Apart',
    'Resident Evil Village',
    'It Takes Two',
    'Halo Infinite',
    'Forza Horizon 5',
    'Psychonauts 2',
    'Hitman 3',
    'Monster Hunter Rise',
    'Tales of Arise',
    'Inscryption',
    'Loop Hero',
    'Shin Megami Tensei V',
    'The Forgotten City',
    'Chicory: A Colorful Tale',
    'Death\'s Door',
    'Unpacking',
    'Wildermyth',
    'Valheim',
    'New Pokemon Snap',
    'The Great Ace Attorney Chronicles',
    'Neo: The World Ends with You',
    'Guilty Gear Strive',
    'The Artful Escape',
    'Kena: Bridge of Spirits',
    'Sable',
    'Eastward',
    'Cruelty Squad',
  ],
  2022: [
    'Elden Ring',
    'God of War Ragnarok',
    'Stray',
    'Xenoblade Chronicles 3',
    'Horizon Forbidden West',
    'Bayonetta 3',
    'Neon White',
    'Sifu',
    'Tunic',
    'Immortality',
    'Pokemon Legends: Arceus',
    'Gran Turismo 7',
    'Norco',
    'Cult of the Lamb',
    'Splatoon 3',
    'A Plague Tale: Requiem',
    'Kirby and the Forgotten Land',
    'Mario + Rabbids Sparks of Hope',
    'Pentiment',
    'Vampire Survivors',
    'The Stanley Parable: Ultra Deluxe',
    'Rollerdrome',
    'Return to Monkey Island',
    'Citizen Sleeper',
    'Signalis',
    'Metal: Hellsinger',
    'Sonic Frontiers',
    'Trek to Yomi',
    'Harvestella',
    'Warhammer 40,000: Darktide',
  ],
  2023: [
    'Baldur\'s Gate 3',
    'The Legend of Zelda: Tears of the Kingdom',
    'Resident Evil 4 Remake',
    'Alan Wake 2',
    'Marvel\'s Spider-Man 2',
    'Hi-Fi Rush',
    'Pikmin 4',
    'Cocoon',
    'Final Fantasy XVI',
    'Armored Core VI: Fires of Rubicon',
    'Super Mario Bros. Wonder',
    'Sea of Stars',
    'Lies of P',
    'Street Fighter 6',
    'Diablo IV',
    'Hogwarts Legacy',
    'Dead Space Remake',
    'Fire Emblem Engage',
    'The Talos Principle 2',
    'Dredge',
    'Octopath Traveler II',
    'Dave the Diver',
    'Starfield',
    'Pizza Tower',
    'Viewfinder',
    'Jusant',
    'El Paso, Elsewhere',
    'Cassette Beasts',
    'Remnant II',
    'Tchia',
  ],
  2024: [
    'Metaphor: ReFantazio',
    'Astro Bot',
    'Black Myth: Wukong',
    'Final Fantasy VII Rebirth',
    'Balatro',
    'Animal Well',
    'Tekken 8',
    'Like a Dragon: Infinite Wealth',
    'Helldivers 2',
    'Silent Hill 2 Remake',
    'Dragon\'s Dogma 2',
    'Stellar Blade',
    'Indiana Jones and the Great Circle',
    '1000xResist',
    'The Legend of Zelda: Echoes of Wisdom',
    'Unicorn Overlord',
    'Persona 3 Reload',
    'Paper Mario: The Thousand-Year Door Remake',
    'Prince of Persia: The Lost Crown',
    'Neva',
    'Thank Goodness You\'re Here!',
    'UFO 50',
    'Satisfactory',
    'Frostpunk 2',
    'S.T.A.L.K.E.R. 2: Heart of Chornobyl',
    'Warhammer 40,000: Space Marine 2',
    'Pacific Drive',
    'Hades II',
    'Still Wakes the Deep',
    'Lorelei and the Laser Eyes',
  ],
  2025: [
    'Clair Obscur: Expedition 33',
    'Kingdom Come: Deliverance II',
    'Civilization VII',
    'Monster Hunter Wilds',
    'Doom: The Dark Ages',
    'Avowed',
    'Assassin\'s Creed Shadows',
    'Split Fiction',
    'Death Stranding 2: On the Beach',
    'Like a Dragon: Pirate Yakuza in Hawaii',
    'Suikoden I & II HD Remaster',
    'Atomfall',
    'Ninja Gaiden 4',
    'Lost Records: Bloom & Rage',
    'South of Midnight',
    'Fragpunk',
    'Hollow Knight: Silksong',
    'Onimusha: Way of the Sword',
    'Ghost of Yotei',
    'Crimson Desert',
    'Metroid Prime 4: Beyond',
    'Pokemon Legends: Z-A',
    'Fable',
    'Borderlands 4',
    'Judas',
    'Marathon',
    'The Outer Worlds 2',
    'GTA VI',
    'The Witcher IV',
    'Rune Factory: Guardians of Azuma',
  ],
};

// ---------------------------------------------------------------------------
// Wikipedia image fetcher (mirrors src/lib/api/wiki-images.ts)
// ---------------------------------------------------------------------------
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'GOATSeeder/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchWikipediaImage(gameName) {
  try {
    const searchTerm = `${gameName} video game`;
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(searchTerm)}&srlimit=1`;
    const searchData = await httpsGet(searchUrl);
    const results = searchData?.query?.search;
    if (!results?.length) return null;

    const pageId = results[0].pageid;
    const pageUrl =
      `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&pageids=${pageId}&prop=pageimages|original&pithumbsize=500`;
    const pageData = await httpsGet(pageUrl);
    const page = pageData?.query?.pages?.[pageId];
    if (!page) return null;

    let imageUrl = page.original?.source || page.thumbnail?.source || null;
    if (!imageUrl) return null;
    // Skip SVG
    if (imageUrl.endsWith('.svg') || imageUrl.includes('.svg/')) {
      imageUrl = page.thumbnail?.source || null;
      if (!imageUrl || imageUrl.endsWith('.svg')) return null;
    }
    return imageUrl;
  } catch {
    return null;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  const client = new Client({ connectionString: POOLER_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to database');

  try {
    const years = Object.keys(GAMES_BY_YEAR).map(Number).sort();
    console.log(`Seeding ${years.length} years: ${years[0]}–${years[years.length - 1]}`);

    let totalItemsInserted = 0;
    let totalItemsSkipped = 0;
    let totalListsCreated = 0;
    let totalListItems = 0;

    for (const year of years) {
      const games = GAMES_BY_YEAR[year];
      console.log(`\n--- ${year} (${games.length} games) ---`);

      // 1. Upsert items
      const itemIds = []; // ordered: index 0 = rank 1
      for (const gameName of games) {
        const { rows } = await client.query(
          `INSERT INTO items (name, category, subcategory, item_year, image_url)
           VALUES ($1, 'games', NULL, $2, NULL)
           ON CONFLICT (name, category, subcategory)
           DO UPDATE SET item_year = COALESCE(EXCLUDED.item_year, items.item_year)
           RETURNING id`,
          [gameName, year]
        );
        itemIds.push(rows[0].id);
      }
      const newCount = itemIds.length;
      totalItemsInserted += newCount;
      console.log(`  Items upserted: ${newCount}`);

      // 2. Create parent list for this year
      const listTitle = `Top 10 Games of ${year}`;
      const { rows: listRows } = await client.query(
        `INSERT INTO lists (title, category, subcategory, user_id, predefined, size, time_period, type, description)
         VALUES ($1, 'games', NULL, $2, true, 10, $3, 'top', $4)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          listTitle,
          OWNER_USER_ID,
          String(year),
          `Rank the 10 greatest games released in ${year}. Drag from the backlog to build your definitive list.`,
        ]
      );

      let listId;
      if (listRows.length > 0) {
        listId = listRows[0].id;
        totalListsCreated++;
        console.log(`  List created: "${listTitle}" (${listId})`);
      } else {
        // List already exists — fetch its id
        const { rows: existing } = await client.query(
          `SELECT id FROM lists WHERE title = $1 AND category = 'games' AND type = 'top' LIMIT 1`,
          [listTitle]
        );
        if (existing.length > 0) {
          listId = existing[0].id;
          console.log(`  List already exists: "${listTitle}" (${listId})`);
        } else {
          console.error(`  ERROR: Could not create or find list "${listTitle}"`);
          continue;
        }
      }

      // 3. Insert list_items for top 10 (default consensus ranking)
      // Clear existing list_items for this list first (idempotent re-runs)
      await client.query(`DELETE FROM list_items WHERE list_id = $1`, [listId]);

      for (let rank = 0; rank < Math.min(10, itemIds.length); rank++) {
        await client.query(
          `INSERT INTO list_items (list_id, item_id, ranking)
           VALUES ($1, $2, $3)`,
          [listId, itemIds[rank], rank + 1]
        );
        totalListItems++;
      }
      console.log(`  List items: 10 default rankings`);
    }

    console.log('\n=== PHASE 1 COMPLETE: Data Inserted ===');
    console.log(`  Items upserted: ${totalItemsInserted}`);
    console.log(`  Lists created: ${totalListsCreated}`);
    console.log(`  List items: ${totalListItems}`);

    // 4. Fetch Wikipedia images (optional)
    if (WITH_IMAGES) {
      console.log('\n=== PHASE 2: Fetching Wikipedia Images ===');

      // Get all game items without images
      const { rows: noImageItems } = await client.query(
        `SELECT id, name FROM items WHERE category = 'games' AND (image_url IS NULL OR image_url = '') ORDER BY name`
      );
      console.log(`Items needing images: ${noImageItems.length}`);

      let fetched = 0;
      let failed = 0;
      const BATCH_SIZE = 5;

      for (let i = 0; i < noImageItems.length; i += BATCH_SIZE) {
        const batch = noImageItems.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (item) => {
            const url = await fetchWikipediaImage(item.name);
            return { id: item.id, name: item.name, url };
          })
        );

        for (const r of results) {
          if (r.url) {
            await client.query(`UPDATE items SET image_url = $1 WHERE id = $2`, [r.url, r.id]);
            fetched++;
          } else {
            failed++;
          }
        }

        const progress = Math.min(i + BATCH_SIZE, noImageItems.length);
        process.stdout.write(`\r  Progress: ${progress}/${noImageItems.length} (${fetched} found, ${failed} missing)`);

        // Rate limit: 200ms between batches
        if (i + BATCH_SIZE < noImageItems.length) await sleep(200);
      }

      console.log(`\n  Images fetched: ${fetched}`);
      console.log(`  Images not found: ${failed}`);
    } else {
      console.log('\nSkipping image fetch (run with --with-images to fetch Wikipedia images)');
    }

    // 5. Update view_count and selection_count for all seeded items
    await client.query(`
      UPDATE items SET
        view_count = GREATEST(view_count, FLOOR(RANDOM() * 300 + 50)),
        selection_count = GREATEST(selection_count, (
          SELECT COUNT(*) FROM list_items WHERE list_items.item_id = items.id
        ))
      WHERE category = 'games' AND item_year BETWEEN 2005 AND 2025
    `);
    console.log('Updated view_count and selection_count');

    console.log('\n=== SEED COMPLETE ===');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('SEED FAILED:', e.message, e.stack);
  process.exit(1);
});
