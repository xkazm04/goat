import type { ArtDirection } from '@/v2/covers/art';

import { DEFAULT_TIERS, type ItemId, type ListDoc, type ListItem } from './types';


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
  imageUrl: string | null = null,
): ListItem {
  return { id, title, year, creator, imageUrl, art: { hues, motif }, traits };
}

export const DEMO_ITEMS: ListItem[] = [
  item("w3", "The Witcher 3", 2015, "CD Projekt Red", [150, 35], "moon", ["narrative","open-world","dark"], "/demo/w3.webp"),
  item("er", "Elden Ring", 2022, "FromSoftware", [42, 20], "sun", ["open-world","challenge","mythic"], "/demo/er.webp"),
  item("bg3", "Baldur's Gate 3", 2023, "Larian Studios", [345, 280], "shard", ["tactical","narrative","reactive"], "/demo/bg3.webp"),
  item("de", "Disco Elysium", 2019, "ZA/UM", [12, 190], "slash", ["narrative","literary","melancholic"], "/demo/de.webp"),
  item("me2", "Mass Effect 2", 2010, "BioWare", [205, 20], "rings", ["narrative","cinematic","companions"], "/demo/me2.webp"),
  item("p5r", "Persona 5 Royal", 2020, "Atlus", [355, 0], "slash", ["style","turn-based","social"], "/demo/p5r.webp"),
  item("ct", "Chrono Trigger", 1995, "Square", [210, 48], "rings", ["classic","turn-based","time"], "/demo/ct.webp"),
  item("ff7", "Final Fantasy VII", 1997, "Square", [130, 200], "grid", ["classic","cinematic","melancholic"], "/demo/ff7.webp"),
  item("pst", "Planescape: Torment", 1999, "Black Isle", [28, 300], "shard", ["literary","narrative","strange"], "/demo/pst.webp"),
  item("ds", "Dark Souls", 2011, "FromSoftware", [24, 220], "sun", ["challenge","dark","mythic"], "/demo/ds.webp"),
  item("fnv", "Fallout: New Vegas", 2010, "Obsidian", [36, 15], "grid", ["reactive","open-world","satire"], "/demo/fnv.webp"),
  item("bb", "Bloodborne", 2015, "FromSoftware", [0, 250], "moon", ["challenge","dark","gothic"], "/demo/bb.webp"),
  item("dos2", "Divinity: Original Sin 2", 2017, "Larian Studios", [270, 175], "rings", ["tactical","reactive","co-op"], "/demo/dos2.webp"),
  item("sky", "Skyrim", 2011, "Bethesda", [200, 215], "shard", ["open-world","freedom","mythic"], "/demo/sky.webp"),
  item("dq11", "Dragon Quest XI", 2017, "Square Enix", [195, 50], "sun", ["classic","turn-based","warm"], "/demo/dq11.webp"),
  item("hk", "Hollow Knight", 2017, "Team Cherry", [220, 190], "moon", ["challenge","melancholic","handmade"], "/demo/hk.webp"),
  item("ff6", "Final Fantasy VI", 1994, "Square", [280, 40], "slash", ["classic","turn-based","melancholic"], "/demo/ff6.webp"),
  item("ffx", "Final Fantasy X", 2001, "Square", [190, 210], "moon", ["cinematic","turn-based","melancholic"], "/demo/ffx.webp"),
  item("xc", "Xenoblade Chronicles", 2010, "Monolith Soft", [210, 140], "grid", ["open-world","mythic","companions"], "/demo/xc.webp"),
  item("ut", "Undertale", 2015, "Toby Fox", [0, 50], "shard", ["handmade","strange","warm"], "/demo/ut.webp"),
  item("poe", "Pillars of Eternity", 2015, "Obsidian", [30, 200], "rings", ["tactical","literary","classic"], "/demo/poe.webp"),
  item("dao", "Dragon Age: Origins", 2009, "BioWare", [355, 25], "slash", ["dark","companions","tactical"], "/demo/dao.webp"),
  item("kotor", "Knights of the Old Republic", 2003, "BioWare", [215, 0], "sun", ["narrative","companions","classic"], "/demo/kotor.webp"),
  item("mw", "Morrowind", 2002, "Bethesda", [35, 160], "shard", ["open-world","strange","freedom"], "/demo/mw.webp"),
  item("fo2", "Fallout 2", 1998, "Black Isle", [45, 90], "grid", ["reactive","satire","classic"], "/demo/fo2.webp"),
  item("vtmb", "Vampire: The Masquerade – Bloodlines", 2004, "Troika Games", [340, 260], "moon", ["gothic","reactive","dark"], "/demo/vtmb.webp"),
  item("d2", "Diablo II", 2000, "Blizzard North", [5, 30], "sun", ["dark","challenge","co-op"], "/demo/d2.webp"),
  item("nier", "NieR: Automata", 2017, "PlatinumGames", [40, 210], "slash", ["melancholic","strange","style"], "/demo/nier.webp"),
  item("s2", "Suikoden II", 1998, "Konami", [120, 30], "rings", ["classic","turn-based","warm"], "/demo/s2.webp"),
  item("eb", "EarthBound", 1994, "Ape / HAL Laboratory", [300, 60], "grid", ["strange","warm","satire"], "/demo/eb.webp"),
  item("pkmn", "Pokémon Red/Blue", 1996, "Game Freak", [0, 210], "sun", ["classic","social","warm"], "/demo/pkmn.webp"),
  item("p4g", "Persona 4 Golden", 2012, "Atlus", [52, 30], "grid", ["social","style","turn-based"]),
  item("ds3", "Dark Souls III", 2016, "FromSoftware", [18, 0], "sun", ["challenge","dark","mythic"], "/demo/ds3.webp"),
  item("sek", "Sekiro: Shadows Die Twice", 2019, "FromSoftware", [0, 30], "slash", ["challenge","style","mythic"], "/demo/sek.webp"),
  item("des", "Demon's Souls", 2009, "FromSoftware", [230, 40], "moon", ["challenge","dark","gothic"], "/demo/des.webp"),
  item("ddda", "Dragon's Dogma", 2012, "Capcom", [25, 220], "shard", ["open-world","challenge","companions"], "/demo/ddda.webp"),
  item("xg", "Xenogears", 1998, "Square", [200, 300], "rings", ["strange","literary","mythic"], "/demo/xg.webp"),
  item("me1", "Mass Effect", 2007, "BioWare", [215, 190], "rings", ["narrative","cinematic","companions"], "/demo/me1.webp"),
  item("cp77", "Cyberpunk 2077", 2020, "CD Projekt Red", [55, 320], "grid", ["open-world","style","reactive"], "/demo/cp77.webp"),
  item("fe3h", "Fire Emblem: Three Houses", 2019, "Intelligent Systems", [10, 220], "shard", ["tactical","social","companions"], "/demo/fe3h.webp"),
  item("oct", "Octopath Traveler", 2018, "Square Enix", [40, 260], "sun", ["turn-based","classic","handmade"], "/demo/oct.webp"),
  item("tos", "Tales of Symphonia", 2003, "Namco Tales Studio", [140, 20], "rings", ["companions","warm","classic"], "/demo/tos.webp"),
  item("kh2", "Kingdom Hearts II", 2005, "Square Enix", [220, 45], "moon", ["style","warm","cinematic"], "/demo/kh2.webp"),
  item("mhw", "Monster Hunter: World", 2018, "Capcom", [100, 30], "shard", ["challenge","co-op","open-world"], "/demo/mhw.webp"),
  item("ff14", "Final Fantasy XIV", 2013, "Square Enix", [210, 260], "rings", ["social","mythic","narrative"], "/demo/ff14.webp"),
  item("pent", "Pentiment", 2022, "Obsidian", [38, 15], "slash", ["literary","handmade","narrative"], "/demo/pent.webp"),
  item("smt5", "Shin Megami Tensei V", 2021, "Atlus", [180, 330], "shard", ["challenge","turn-based","mythic"], "/demo/smt5.webp"),
  item("lo", "Lost Odyssey", 2007, "Mistwalker", [215, 35], "moon", ["melancholic","literary","turn-based"], "/demo/lo.webp"),
  item("som", "Secret of Mana", 1993, "Square", [95, 170], "sun", ["classic","co-op","warm"], "/demo/som.webp"),
  item("kotor2", "KOTOR II: The Sith Lords", 2004, "Obsidian", [260, 0], "slash", ["literary","dark","companions"], "/demo/kotor2.webp"),
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
