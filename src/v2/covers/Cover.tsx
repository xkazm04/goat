'use client';

import { useState } from 'react';

import type { ListItem } from '@/v2/list/types';

/**
 * An item's cover. Real artwork first (decision, round 8); if there is none,
 * or it fails to load, the generative cover drawn from the item's art direction.
 */
export function Cover({ item, title = true }: { item: ListItem; title?: boolean }) {
  const [broken, setBroken] = useState(false);
  const showImage = item.imageUrl && !broken;

  return (
    <div
      className="v2-cover"
      data-motif={item.art.motif}
      style={{ ['--h1' as string]: item.art.hues[0], ['--h2' as string]: item.art.hues[1] }}
    >
      {showImage ? (
        // Artwork comes from arbitrary enrichment hosts, so next/image's host allowlist does not fit here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl!} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : null}
      {item.year !== null ? <span className="v2-cover-year">{item.year}</span> : null}
      {title ? <span className="v2-cover-title">{item.title}</span> : null}
    </div>
  );
}
