'use client';

import { memo, useEffect, useRef } from 'react';

import './plates.css';

/**
 * The Spread's engraved plate (design/winner, "Plate I: Capra maxima"): a copperplate tipped into the right
 * margin with trim marks and a printed caption. The caption follows the tier at the top of the page, so the
 * plate reads with you. That is done with an IntersectionObserver writing two text nodes directly: scrolling
 * costs no React render.
 */

const PLACES = [
  { plate: 'Plate I', place: 'The summit' },
  { plate: 'Plate II', place: 'The ridge' },
  { plate: 'Plate III', place: 'The slope' },
  { plate: 'Plate IV', place: 'The foothills' },
] as const;

function SpreadPlateView() {
  const plate = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = plate.current?.closest('.sp-wrap');
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const plateNo = plate.current!.querySelector<HTMLElement>('[data-plate]');
    const place = plate.current!.querySelector<HTMLElement>('[data-place]');
    const tiers = [...root.querySelectorAll<HTMLElement>('.sp-tier')];
    if (!plateNo || !place || tiers.length === 0) return;

    let shown = -1;
    const show = (i: number) => {
      const p = PLACES[Math.min(i, PLACES.length - 1)];
      if (i === shown) return;
      shown = i;
      plateNo.textContent = p.plate;
      place.textContent = p.place;
    };
    // The tier whose heading last crossed the upper third of the viewport is the one being read.
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));
        const above = tiers.map((t, i) => ({ i, top: t.getBoundingClientRect().top })).filter((x) => x.top < window.innerHeight * 0.4);
        show(above.length ? above[above.length - 1].i : 0);
      },
      { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] },
    );
    tiers.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <aside className="plate" ref={plate} aria-label="Stylised engraving of the G.O.A.T. mark">
      <div className="plate-sheet">
        <div className="plate-grain" />
        <div className="plate-frame">
          {/* eslint-disable-next-line @next/next/no-img-element -- baked, fixed-size art; next/image adds nothing */}
          <img className="plate-img" src="/art/spread-plate.webp" width={450} height={563} alt="" decoding="async" draggable={false} />
          <span className="plate-sparkle plate-sparkle-a" />
          <span className="plate-sparkle plate-sparkle-b" />
        </div>
        <div className="plate-crops" />
      </div>
      <div className="plate-cap">
        <div className="cap-row">
          <span>Fig. 1</span>
          <span data-plate>Plate I</span>
        </div>
        <div className="cap-title">
          <i>Capra maxima</i>
          <span data-place>The summit</span>
        </div>
        <p className="cap-fine">Stylised engraving after the G.O.A.T. mark. Designed art, not a photograph.</p>
      </div>
    </aside>
  );
}

export const SpreadPlate = memo(SpreadPlateView);
