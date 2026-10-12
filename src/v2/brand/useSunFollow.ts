'use client';

import { useEffect, type RefObject } from 'react';

/**
 * The Mosaic's sun turns to whatever cover you point at (design/winner, "the light follows you"). The pointer
 * handler is delegated on the panel and writes two CSS variables on the sun element: no React state, no
 * re-render, and the move itself is a compositor-only transform transition (plates.css).
 *
 * With nothing hovered the sun rests on the number-one tile.
 */
export function useSunFollow(panel: RefObject<HTMLElement | null>, selector = '.mo-tile') {
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const sun = el.querySelector<HTMLElement>('[data-sun]');
    if (!sun) return;

    // The sun's resting centre is set in CSS as a fraction of the panel; offsets are measured from it.
    const rest = () => {
      const r = el.getBoundingClientRect();
      return { x: r.width * 0.44, y: r.height * 0.34, left: r.left, top: r.top };
    };
    let frame = 0;
    let target: Element | null = null;
    const apply = () => {
      frame = 0;
      const base = rest();
      if (!target) {
        sun.style.setProperty('--dx', '0px');
        sun.style.setProperty('--dy', '0px');
        return;
      }
      const t = target.getBoundingClientRect();
      sun.style.setProperty('--dx', `${Math.round(t.left + t.width / 2 - base.left - base.x)}px`);
      sun.style.setProperty('--dy', `${Math.round(t.top + t.height * 0.35 - base.top - base.y)}px`);
    };
    const schedule = (next: Element | null) => {
      if (next === target) return;
      target = next;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const over = (e: PointerEvent) => schedule((e.target as Element | null)?.closest?.(selector) ?? null);
    const leave = () => schedule(null);

    el.addEventListener('pointerover', over, { passive: true });
    el.addEventListener('pointerleave', leave, { passive: true });
    return () => {
      el.removeEventListener('pointerover', over);
      el.removeEventListener('pointerleave', leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [panel, selector]);
}
