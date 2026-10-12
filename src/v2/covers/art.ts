/**
 * Art direction for an item's generative cover: two hues and a motif, in the
 * house style of the v2 studies (docs/v2/prototypes/shared.css). Real artwork
 * is shown first when an item has one; this drives the fallback cover and the
 * colour glows either way. In M3 Claude chooses these per item; until then
 * `fallbackArt` derives a stable one from the item's title.
 */

export const MOTIFS = ['sun', 'rings', 'grid', 'slash', 'moon', 'shard'] as const;

type Motif = (typeof MOTIFS)[number];

export interface ArtDirection {
  hues: [number, number];
  motif: Motif;
}

/** FNV-1a, so the same title always gets the same cover. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function fallbackArt(seed: string): ArtDirection {
  const h = hash(seed.trim().toLowerCase());
  const hue1 = h % 360;
  // The second hue sits 60–240 degrees away, so the two never read as one colour.
  const hue2 = (hue1 + 60 + ((h >>> 9) % 181)) % 360;
  return { hues: [hue1, hue2], motif: MOTIFS[(h >>> 17) % MOTIFS.length] };
}

/** Accept stored art only when it has the right shape; otherwise derive one. */
export function artOrFallback(value: unknown, seed: string): ArtDirection {
  if (value && typeof value === 'object') {
    const v = value as { hues?: unknown; motif?: unknown };
    const hues = v.hues;
    const okHues =
      Array.isArray(hues) && hues.length === 2 && hues.every((n) => typeof n === 'number' && n >= 0 && n < 360);
    const okMotif = typeof v.motif === 'string' && (MOTIFS as readonly string[]).includes(v.motif);
    if (okHues && okMotif) return { hues: [hues[0], hues[1]] as [number, number], motif: v.motif as Motif };
  }
  return fallbackArt(seed);
}
