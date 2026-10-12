'use client';

import { memo, useRef } from 'react';

import { ModeArt } from '@/v2/brand/ModeArt';
import { useSunFollow } from '@/v2/brand/useSunFollow';
import { projectMosaic } from '@/v2/list/projections';

import { Card, EmptySlot, RankSlot } from './Card';
import { useEditor } from './context';

/** Mosaic: the poster wall. Tile size decays with rank; promoting an item grows it. */
function MosaicView() {
  const panel = useRef<HTMLDivElement>(null);
  useSunFollow(panel);
  const doc = useEditor((s) => s.history.present);
  const items = useEditor((s) => s.items);
  const bands = projectMosaic(doc);
  const hero = doc.order[0] ? items[doc.order[0]] : null;

  return (
    <div className="mo" ref={panel} style={hero ? { ['--hero-h' as string]: hero.art.hues[1] } : undefined}>
      <ModeArt mode="mosaic" />
      {bands.map((band) => {
        // The top band holds #1 (hero) and #2–3 (large); other bands share one tile size.
        const scale = band.tiles[0]?.scale === 'hero' ? 'hero' : (band.tiles[0]?.scale ?? 'small');
        return (
          <section key={band.tier} className="mo-band" aria-label={`${band.tier}, ranks ${band.from} to ${band.to}`}>
            <h2>
              {band.tier}
              <span>
                {band.from}–{band.to}
              </span>
            </h2>
            <div className="mo-grid" data-scale={scale}>
              {band.tiles.map((tile) => {
                const item = tile.id ? items[tile.id] : null;
                return (
                  <RankSlot key={tile.rank} index={tile.rank - 1} className="mo-tile" data-scale={tile.scale}>
                    <span className="mo-rank" aria-hidden="true">
                      {tile.rank}
                    </span>
                    {item ? (
                      <Card id={item.id} title={tile.scale !== 'tiny'} label={`#${tile.rank} ${item.title}`} />
                    ) : (
                      <EmptySlot rank={tile.rank} compact={tile.scale === 'small' || tile.scale === 'tiny'} />
                    )}
                  </RankSlot>
                );
              })}
            </div>
            {band.open > 0 ? (
              <div className="mo-open">
                +{band.open} open {band.open === 1 ? 'rank' : 'ranks'}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/** Memoised: the Editor re-renders on every edit, but the wall only needs to when its own state changes. */
export const Mosaic = memo(MosaicView);
