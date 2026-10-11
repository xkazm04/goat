import { DEFAULT_TIERS, type ItemId, type ListDoc, type ListItem } from './types';

import type { ArtDirection } from '@/v2/covers/art';

/**
 * The demo list behind /v2/l/demo: the 50 RPGs the v2 studies were designed
 * around (docs/v2/prototypes/shared.js + items-extended.js). It lives in the
 * browser only, so the editor works with no database configured.
 */

function item(
  id: ItemId,
  title: string,
  year: number,
  creator: string,
  hues: [number, number],
  motif: ArtDirection['motif'],
  traits: string[],
): ListItem {
  return { id, title, year, creator, imageUrl: null, art: { hues, motif }, traits };
}

export const DEMO_ITEMS: ListItem[] = [
  item("w3", "The Witcher 3", 2015, "CD Projekt Red", [150, 35], "moon", ["narrative","open-world","dark"]),
  item("er", "Elden Ring", 2022, "FromSoftware", [42, 20], "sun", ["open-world","challenge","mythic"]),
  item("bg3", "Baldur's Gate 3", 2023, "Larian Studios", [345, 280], "shard", ["tactical","narrative","reactive"]),
  item("de", "Disco Elysium", 2019, "ZA/UM", [12, 190], "slash", ["narrative","literary","melancholic"]),
  item("me2", "Mass Effect 2", 2010, "BioWare", [205, 20], "rings", ["narrative","cinematic","companions"]),
  item("p5r", "Persona 5 Royal", 2020, "Atlus", [355, 0], "slash", ["style","turn-based","social"]),
  item("ct", "Chrono Trigger", 1995, "Square", [210, 48], "rings", ["classic","turn-based","time"]),
  item("ff7", "Final Fantasy VII", 1997, "Square", [130, 200], "grid", ["classic","cinematic","melancholic"]),
  item("pst", "Planescape: Torment", 1999, "Black Isle", [28, 300], "shard", ["literary","narrative","strange"]),
  item("ds", "Dark Souls", 2011, "FromSoftware", [24, 220], "sun", ["challenge","dark","mythic"]),
  item("fnv", "Fallout: New Vegas", 2010, "Obsidian", [36, 15], "grid", ["reactive","open-world","satire"]),
  item("bb", "Bloodborne", 2015, "FromSoftware", [0, 250], "moon", ["challenge","dark","gothic"]),
  item("dos2", "Divinity: Original Sin 2", 2017, "Larian Studios", [270, 175], "rings", ["tactical","reactive","co-op"]),
  item("sky", "Skyrim", 2011, "Bethesda", [200, 215], "shard", ["open-world","freedom","mythic"]),
  item("dq11", "Dragon Quest XI", 2017, "Square Enix", [195, 50], "sun", ["classic","turn-based","warm"]),
  item("hk", "Hollow Knight", 2017, "Team Cherry", [220, 190], "moon", ["challenge","melancholic","handmade"]),
  item("ff6", "Final Fantasy VI", 1994, "Square", [280, 40], "slash", ["classic","turn-based","melancholic"]),
  item("ffx", "Final Fantasy X", 2001, "Square", [190, 210], "moon", ["cinematic","turn-based","melancholic"]),
  item("xc", "Xenoblade Chronicles", 2010, "Monolith Soft", [210, 140], "grid", ["open-world","mythic","companions"]),
  item("ut", "Undertale", 2015, "Toby Fox", [0, 50], "shard", ["handmade","strange","warm"]),
  item("poe", "Pillars of Eternity", 2015, "Obsidian", [30, 200], "rings", ["tactical","literary","classic"]),
  item("dao", "Dragon Age: Origins", 2009, "BioWare", [355, 25], "slash", ["dark","companions","tactical"]),
  item("kotor", "Knights of the Old Republic", 2003, "BioWare", [215, 0], "sun", ["narrative","companions","classic"]),
  item("mw", "Morrowind", 2002, "Bethesda", [35, 160], "shard", ["open-world","strange","freedom"]),
  item("fo2", "Fallout 2", 1998, "Black Isle", [45, 90], "grid", ["reactive","satire","classic"]),
  item("vtmb", "Vampire: The Masquerade – Bloodlines", 2004, "Troika Games", [340, 260], "moon", ["gothic","reactive","dark"]),
  item("d2", "Diablo II", 2000, "Blizzard North", [5, 30], "sun", ["dark","challenge","co-op"]),
  item("nier", "NieR: Automata", 2017, "PlatinumGames", [40, 210], "slash", ["melancholic","strange","style"]),
  item("s2", "Suikoden II", 1998, "Konami", [120, 30], "rings", ["classic","turn-based","warm"]),
  item("eb", "EarthBound", 1994, "Ape / HAL Laboratory", [300, 60], "grid", ["strange","warm","satire"]),
  item("pkmn", "Pokémon Red/Blue", 1996, "Game Freak", [0, 210], "sun", ["classic","social","warm"]),
  item("p4g", "Persona 4 Golden", 2012, "Atlus", [52, 30], "grid", ["social","style","turn-based"]),
  item("ds3", "Dark Souls III", 2016, "FromSoftware", [18, 0], "sun", ["challenge","dark","mythic"]),
  item("sek", "Sekiro: Shadows Die Twice", 2019, "FromSoftware", [0, 30], "slash", ["challenge","style","mythic"]),
  item("des", "Demon's Souls", 2009, "FromSoftware", [230, 40], "moon", ["challenge","dark","gothic"]),
  item("ddda", "Dragon's Dogma", 2012, "Capcom", [25, 220], "shard", ["open-world","challenge","companions"]),
  item("xg", "Xenogears", 1998, "Square", [200, 300], "rings", ["strange","literary","mythic"]),
  item("me1", "Mass Effect", 2007, "BioWare", [215, 190], "rings", ["narrative","cinematic","companions"]),
  item("cp77", "Cyberpunk 2077", 2020, "CD Projekt Red", [55, 320], "grid", ["open-world","style","reactive"]),
  item("fe3h", "Fire Emblem: Three Houses", 2019, "Intelligent Systems", [10, 220], "shard", ["tactical","social","companions"]),
  item("oct", "Octopath Traveler", 2018, "Square Enix", [40, 260], "sun", ["turn-based","classic","handmade"]),
  item("tos", "Tales of Symphonia", 2003, "Namco Tales Studio", [140, 20], "rings", ["companions","warm","classic"]),
  item("kh2", "Kingdom Hearts II", 2005, "Square Enix", [220, 45], "moon", ["style","warm","cinematic"]),
  item("mhw", "Monster Hunter: World", 2018, "Capcom", [100, 30], "shard", ["challenge","co-op","open-world"]),
  item("ff14", "Final Fantasy XIV", 2013, "Square Enix", [210, 260], "rings", ["social","mythic","narrative"]),
  item("pent", "Pentiment", 2022, "Obsidian", [38, 15], "slash", ["literary","handmade","narrative"]),
  item("smt5", "Shin Megami Tensei V", 2021, "Atlus", [180, 330], "shard", ["challenge","turn-based","mythic"]),
  item("lo", "Lost Odyssey", 2007, "Mistwalker", [215, 35], "moon", ["melancholic","literary","turn-based"]),
  item("som", "Secret of Mana", 1993, "Square", [95, 170], "sun", ["classic","co-op","warm"]),
  item("kotor2", "KOTOR II: The Sith Lords", 2004, "Obsidian", [260, 0], "slash", ["literary","dark","companions"]),
];

const RANKED: ItemId[] = ["er","w3","bg3","de","me2","ds","bb","p5r","ct","pst","fnv","hk"];

const NOTES: Record<ItemId, string> = {
  "w3": "Side quests written better than most games' main plots.",
  "er": "Wonder per minute, unmatched. Every horizon is a promise kept.",
  "bg3": "The game that says yes to every stupid idea you have.",
  "de": "A novel that argues with you. Your own skills heckle you.",
  "me2": "The suicide mission is still the best final act in games.",
  "p5r": "Pure style. Even the menus have swagger.",
  "ct": "No filler, thirteen endings, perfect pacing.",
};

export function demoDoc(): ListDoc {
  return {
    id: 'demo',
    title: 'The Greatest RPGs Ever Made',
    topic: 'Video games · Role-playing',
    size: 25,
    order: [...RANKED],
    pool: DEMO_ITEMS.map((i) => i.id).filter((id) => !RANKED.includes(id)),
    tiers: DEFAULT_TIERS.map((t) => ({ ...t })),
    notes: { ...NOTES },
    canvasX: {},
    stagePreset: 'podium',
  };
}
