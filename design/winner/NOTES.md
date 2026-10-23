# Plate I: Capra maxima

## Philosophy
The Spread is a printed leaf, so the goat is its plate: a copperplate engraving tipped into the right margin with trim marks and a Fig./Plate caption, as the current art promised. A small line-screen engraver draws it from the brand silhouette: line weight follows the light, lines ride the form, and gold ink is light, so the sun behind lights the goat. The plate reads with you: its caption follows the tier in view (Plate I to IV), names the item, and an altitude rule tracks the scroll while the scenery sinks from summit to slope.

Round 2 turns the leaf into a book of four plates, one per view, all cut with the same engraver: the gold line screen, the sun with its rays, hachured ridges, a lit lip on every ledge, trim marks and a Latin Fig. caption. Each view answers what it is for.

| Key | View | Plate | What the art does |
| --- | --- | --- | --- |
| 1 | Mosaic | Opus tessellatum, the hang | Covers stand on engraved ledges, one per tier. The goat keeps the number-one ledge. The sun sits behind the number-one cover and moves to whatever you hover. |
| 2 | Canvas | Ascensus, the ascent | Height is rank, so the whole board is one engraved range. The goat stands on the summit plateau; pins climb the faces; an altitude rule runs down the left edge. |
| 3 | Spread | Capra maxima, the leaf | As the owner saw it: the engraved plate in the right margin and the editorial column. |
| 4 | Stage | Scaena / Mons sculptus / Solium | A proscenium of engraved drapes and a scalloped valance, lamps that find each lit cover, a plinth for each rank. Podium, Rushmore (a hachured mountain, four heads in niches) and Throne (the goat's horns as the seat's back). The goat watches from the right wing. |

Below every view is the same lower level: click any cover and it opens into its own sheet with an ornament engraved in the item's own colours, with a way back at every step (Back button, Esc, neighbours on the arrow keys).

## How it stays readable at scale
Content outranks the art in every view. Spread: the column keeps its 49rem measure and the plate its reserved sticky margin, so nothing is printed under type. Mosaic: the sky and the ledges sit behind the tiles; the number-one cover, the reading slip and the goat each have their own column. Canvas: the range is dark where pins sit and bright only along crests; every pin carries its rank badge and a name label that flips side to avoid the edge, and no two pins or labels overlap at 390, 1280 and 1920 px (measured in the browser). Stage: covers stand on their plinths in front of the lamps; drapes occupy the outer 6rem. The composition scales with the root size from 1280 to 2560; below 1100px the plate becomes a figure and each view stacks. Body text is 14px or larger at 1280x800 and nothing the reader must read is under 12px (checked in the page at five sizes). Under `prefers-reduced-motion` every view is a still engraving: nothing rotates, drifts, blinks or flies, and the covers arrive without staggering.

## The wow moment
The light arrives, and then it follows you. In the Spread the engraving opens outward from the sun and then the sun becomes the row you hover. In Mosaic, Canvas and Stage the same gesture is used at the scale of the view: hover a cover and its rank and name are set at display size on a reading slip beside the number-one cover (Mosaic, Stage) or in the sky above the first band (Canvas), the sun (Mosaic) or the lamp (Stage) turns to it, and Canvas draws a dotted lead line from the altitude rule to its height. Changing view is one move: the covers fly from where they were to where they now stand, the plate prints in again from the sun.

## What changed in round 2

Sentences quoted are the owner's own, from "What the owner said about the field as a whole", unless marked as the first round's panel or the brief's bar for this round.

**Answers: "all variants though made only one mode instead of creating package with all" and "other modes need their own designs".**
- `index.html` is now the whole package: a toolbar like the app's, with Mosaic, Canvas, Spread and Stage live over the demo list in `../data/demo-list.js`, keys 1 to 4 switching, and `#mosaic`, `#canvas`, `#spread`, `#stage:podium|rushmore|throne` opening a view directly. The sliding gold indicator in the toolbar and the cover flight between views make moving between the four obvious and smooth.
- Mosaic is new. Tier bands hung on engraved ledges: rank 1 a hero tile, ranks 2 and 3 large, then medium, small, tiny tiles for the lower bands; open ranks are blank plates with their number. A sun with rays sits behind the hero cover and moves to the tile you hover; the goat stands on the number-one ledge looking back along the wall. Tiles lift and drop onto each other to re-rank; Alt+arrows, Delete and Enter work from the keyboard.
- Canvas is new. The board is one hachured mountain range with the goat on the summit, a rank ruler on the left edge, tier names with their plate and place, and a bracket naming the open ranks. Pins drag up and down to re-rank and sideways freely (one undo step); the tier lines have a handle that drags (or moves with the up and down keys) and snaps between ranks; dragging near the window edge scrolls the page.
- Stage is new, with all three presets. Podium: three plinths of different height. Rushmore: four heads in oval niches against an engraved mountain, the name on each plinth. Throne: one cover with the goat's horns for a back. Run tournament is live: a face-off of two covers (click or Left/Right), a bracket filling in, and the result ranks the list in a single undoable step.
- Every view has "In the wings" or its tier equivalent for the rest of the ranked list, a Fig. caption that names the plate and says it is stylised, and a calm still version.

**Answers: "So we have winner for Spread" and the host's reading "The Spread you built stays as the owner saw it. Do not redesign it".**
- The Spread keeps its engraved plate, caption, altitude rule, tier-following caption, tondo sun and the 49rem column. Its engraver was lifted out into a shared library (`engrave.js`) and the other three views are cut with it, so the four read as one art language: the same goat, the same lighting (the plate's sun behind the head for the Spread, a sun in front for Mosaic, Canvas and Stage), the same way of treating the line screen and the paper.

**Answers: "let competitors complete their variants to involve all modes, so we see whether to use one winner or fuse".**
- The goat, the sun and the ridges are built from the same functions in every view, with different compositions and different camera, so that a fusion with another package (for example this package's Mosaic and Stage with another package's Spread) would not clash.
- Each view has one idea of its own that does not appear in the others: the ledge (Mosaic), the rank-as-altitude range (Canvas), the proscenium with lamps and the three presets (Stage).

**Answers the first round's panel: "The plate is a closed rectangle, so the art stays a picture beside the page rather than part of it".**
- The plate's sky is carried out of the frame, faintly: its sky lines continue across the margin behind it, fading out before the column starts, the sun's long rays leak past the frame and its glow lights the page. Measured against the page without it, the change is at most 3 of 255 levels over the text column and up to 26 in the margin, so the column's contrast is untouched. The plate is still a plate, but it now sits in the page's light instead of only beside it.

**Answers the first round's panel: "annotation type drops to 7.2 px at 1280x800".**
- Every caption, tick, tier range and cover year is 12px or larger at 1280x800. The 7.2px was the cover year (6.5% of a 110px cover, clamped at 0.45rem); it is now 12px, the plate caption lines went from 11 to 12 and 13px, and the tier ranges from 13 to 14px. The type floor was checked in the browser by walking every visible text node in all four views at 390, 1100, 1280, 1920 and 2560 px wide: none under 12px.

**Answers the brief's bar for this round: "Practical first", "Levels, not one layer", "Content outranks decoration".**
- Body text is 14px or larger at 1280x800 and nothing the reader must read is under 12px; no label is cut mid-word (labels wrap to a second line instead).
- A second level under every view, the item plate: any cover opens into its own sheet (cover, rank, title, creator, your note, traits, neighbours) over an ornament engraved in its own colours (a sun for the sun-motif covers, rings, a horizon grid, slashes, a moon, shards), with Back, Esc, and Left/Right to walk the list. The cover flies from its place to the sheet and back.
- Choreographed beats: arrival (the covers come up in order, the drape falls, lamps light one by one), choosing (the sun, lamp or lead line goes to the item you hover), opening (the item plate), and returning (the cover flies home, focus returns to where you were).
- Heavy canvases are drawn once and moved with CSS; the only continuous work is the plate's own paint at 36fps, a slow stepped sun rotation and a few glints.

## Known limits
- The pool sidebar is omitted; the brief names toolbar, title and the four views. Challenge me is still a stub and says so.
- The goat is mirrored to face the column (Spread) or the covers (the other views).
- The cover tondo uses embedded grey thumbnails, because a canvas cannot read file:// images; the item plate's ornament is drawn from the cover's hues and motif for the same reason, and it never reproduces the cover.
- The tournament seeds up to eight covers (the top eight), as the app does.
- Timing was measured once per size in a headless, software-rendered browser: 1280x800 held 60 fps in all four views, 1920x1080 about 45 to 58, 2560x1440 about 28 to 47. A GPU should do better; I did not measure one.
- Fonts are embedded (the app's own three), so it runs offline. They have no arrow or numero glyphs, so the page uses words ("Rank 5", "Next") and drawn chevrons instead.
