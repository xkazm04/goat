# Demo list cover sources

Covers for the `/v2/l/demo` list (`DEMO_ITEMS` in `src/v2/list/fixtures.ts`).
Each file is named after the item id. The list has 50 items, not 25 as the brief said.
49 of 50 now have a local cover. `p4g` is null.

Source codes:
- **A** git: `git show d50aad9:public/games/<name>` (v1 covers, matched by title)
- **B** v1 Supabase `items` table (column `name`, column `image_url`), matched by title, then downloaded
- **C** Wikipedia REST summary (`originalimage.source`) or the Wikipedia page image, downloaded

Every image was checked by eye against its item title on a contact sheet, except where noted.

## A. Git history (d50aad9)

| id | file | notes |
|---|---|---|
| er | er.jpg | Elden Ring. Small (300x168), landscape logo art |
| bg3 | bg3.jpg | Baldur's Gate 3. Small (183x275) |
| de | de.jpg | Disco Elysium. Small (184x274) |
| me2 | me2.jpg | Mass Effect 2. Small (225x225) |
| ct | ct.jpg | Chrono Trigger. Emblem/logo, not box art |
| ds | ds.jpg | Dark Souls. Landscape scene art (480x270) |
| fnv | fnv.jpg | Fallout: New Vegas. Small (250x286) |
| bb | bb.jpg | Bloodborne |
| dos2 | dos2.jpg | Divinity: Original Sin II. Large source (1000x1500), 242 KB |
| dao | dao.jpg | Dragon Age: Origins |
| fo2 | fo2.jpg | Fallout 2. Small (250x250) |
| hk | hk.png | Hollow Knight |
| d2 | d2.png | Diablo II |
| cp77 | cp77.webp | Cyberpunk 2077. Landscape key art (1024x576), "Ultimate Edition" art |

## B. v1 Supabase `items` table

The table column is `name`, not `title`. The table has rows that point at the wrong game
(see "Rejected B rows" below), so each pick was checked by eye.

| id | file | source row / URL | notes |
|---|---|---|---|
| p5r | p5r.jpg | "Persona 5 Royal", Steam header | Landscape store header, not box art |
| ut | ut.jpg | "Undertale", Wikimedia Commons cover | |
| poe | poe.jpg | "Pillars of Eternity", Wikipedia 250px thumb | Small (250x315) |
| nier | nier.jpg | "NieR: Automata", Wikipedia cover | |
| sek | sek.jpg | "Sekiro: Shadows Die Twice", Wikipedia art | |
| des | des.jpg | "Demon's Souls", Wikipedia 2020 remake cover | Art is the 2020 remake; item year is 2009 |
| me1 | me1.jpg | "Mass Effect" (MassEffect.jpg) | Checked: this is the Mass Effect 1 cover |
| fe3h | fe3h.jpg | "Fire Emblem: Three Houses", Wikipedia cover | |
| oct | oct.jpg | "Octopath Traveler", Wikipedia cover | |
| mhw | mhw.jpg | "Monster Hunter: World", Steam header | Landscape store header |
| pent | pent.jpg | "Pentiment", Wikimedia Commons wide cover | Shrunk from 816 KB to 600x338, 30 KB |
| lo | lo.jpg | "Lost Odyssey", Wikipedia cover | |
| sky | sky.png | "The Elder Scrolls V: Skyrim", Wikipedia cover | Small (250x342) |
| kotor | kotor.jpg | "Star Wars: KOTOR", Steam header | Landscape store header |
| kotor2 | kotor2.jpg | "Star Wars: KOTOR II", Steam header | Landscape store header |
| w3 | w3.jpg | "The Witcher 3: Wild Hunt", Steam header | Title on the item is "The Witcher 3". Landscape store header |

## C. Wikipedia

| id | file | source | notes |
|---|---|---|---|
| ds3 | ds3.jpg | Wikipedia, Dark Souls III cover | |
| ddda | ddda.jpg | Wikipedia, Dragon's Dogma (2012) cover | The v1 row for this title was the Dragon's Dogma 2 cover, not used |
| kh2 | kh2.jpg | Wikipedia, Kingdom Hearts II (PS2) cover | The v1 row for this title was the Kingdom Hearts I art, not used |
| ff14 | ff14.jpg | Wikipedia, Final Fantasy XIV: A Realm Reborn box cover | Item year is 2013, so this matches the launch/ARR release. Doubtful about edition |
| smt5 | smt5.png | Wikipedia, Shin Megami Tensei V cover | |
| ff7 | ff7.jpg | Wikipedia, Final Fantasy VII box art | |
| pst | pst.jpg | Wikipedia, Planescape: Torment box | |
| dq11 | dq11.jpg | Wikipedia, Dragon Quest XI cover | Large, 183 KB |
| ff6 | ff6.jpg | Wikipedia, Final Fantasy VI cover | |
| ffx | ffx.jpg | Wikipedia, Final Fantasy X cover (PS2) | |
| mw | mw.jpg | Wikipedia, The Elder Scrolls III: Morrowind cover | |
| vtmb | vtmb.png | Wikipedia, Vampire: The Masquerade - Bloodlines cover | |
| s2 | s2.jpg | Wikipedia, Suikoden II cover | |
| eb | eb.jpg | Wikipedia, EarthBound box | |
| pkmn | pkmn.webp | Wikipedia, Pokemon Red and Blue cover art | Composite of Red, Blue and Yellow boxes, not only Red/Blue. Doubtful |
| xg | xg.jpg | Wikipedia, Xenogears box | |
| tos | tos.jpg | Wikipedia, Tales of Symphonia case cover | |
| som | som.jpg | Wikipedia, Secret of Mana box | |
| xc | xc.png | Wikipedia, Xenoblade Chronicles (video game) box art | The item is the 2010 original. The v1 DB row for "Xenoblade Chronicles" did not exist |

## Null (no image)

- **p4g** Persona 4 Golden: no suitable image found. The v1 DB row "Persona 4 Golden"
  points at `P4A_promo.jpg` (a Persona 4 Arena promo, a different game). Wikipedia's
  "Persona 4 Golden" page uses the 2008 base-game cover, which is not the Golden cover.
  Left null rather than use the wrong game.

## Rejected B rows (wrong game, not used)

- Dragon's Dogma: row URL is Dragon's Dogma 2 cover art.
- Kingdom Hearts II: row URL is Kingdom Hearts I art.
- Persona 4 Golden: row URL is a Persona 4 Arena promo.
- Dark Souls III: row URL is the Dark Souls I cover. Wikipedia's DS3 cover was used instead.
- Mass Effect 2: row URL is the Mass Effect 1 cover. The v1 git cover was used instead.
- Rejected for the same reason: the "Suikoden I & II HD Remaster" row (wrong edition, art
  unclear), the "Xenoblade Chronicles 2/3/X" rows (different games), and the "Final Fantasy VII
  Remake/Rebirth" rows (different games).

## Other notes

- These items had no usable Supabase row, so they came from Wikipedia (C): Dragon Quest XI,
  Final Fantasy VI, Final Fantasy X, Final Fantasy VII, Planescape: Torment, Morrowind,
  Vampire: Bloodlines, Suikoden II, EarthBound, Pokemon Red/Blue, Xenogears, Tales of Symphonia,
  Secret of Mana, Xenoblade Chronicles, Final Fantasy XIV, Shin Megami Tensei V.
  Dark Souls III, Dragon's Dogma and Kingdom Hearts II also came from Wikipedia, because their
  Supabase rows were the wrong game.
- Several sources are below 300px on the long side (er, bg3, de, me2, fnv, fo2, hk, d2, sky,
  poe, vtmb, smt5, xc). They may look soft at large sizes.
- Steam and some Wikipedia images are landscape headers, not portrait covers.
- Total size of this folder: about 3.4 MB. No file is over 400 KB after shrinking pent.jpg.
- Covers are used for demo purposes only. The rights belong to their publishers.
