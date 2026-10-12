import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { REVEAL_FIRST } from './Card';

const read = (rel: string) => readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('the staggered arrival', () => {
  it('staggers only the first few items, so a switch never animates the whole list', () => {
    expect(REVEAL_FIRST).toBeGreaterThan(0);
    expect(REVEAL_FIRST).toBeLessThanOrEqual(12);
  });

  const css = read('../brand/plates.css');

  it('plays only inside the editor boot window, so placing a cover never replays an entrance', () => {
    expect(css).toMatch(/\.ed\[data-boot\] \.rv \{/);
    // outside the window .rv has no animation rule at all
    expect(css.match(/\.rv \{/g)).toHaveLength(1);
  });

  it('never fades the page title from zero: it is the largest text and its paint must not be delayed', () => {
    expect(css).toMatch(/\.ed-title \{\s*animation-name: rv-slide;/);
    const slide = css.match(/@keyframes rv-slide \{[^}]*\{[^}]*\}[^}]*\}/)![0];
    expect(slide).not.toContain('opacity');
  });

  it('animates with the independent translate property, so it composes with transforms the views use', () => {
    for (const name of ['rv-in', 'ma-rise']) {
      const start = css.indexOf(`@keyframes ${name} {`);
      expect(start, name).toBeGreaterThan(-1);
      const block = css.slice(start, css.indexOf('\n}', start));
      expect(block).toContain('translate:');
      expect(block).not.toContain('transform');
    }
  });

  it('asks for less motion: every entrance is behind prefers-reduced-motion: no-preference', () => {
    const idx = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(idx).toBeGreaterThan(0);
    expect(css.slice(0, idx)).not.toMatch(/animation: (rv-in|ma-in)/);
  });

  it('pauses the art while a cover is dragged', () => {
    expect(css).toMatch(/\.ed\[data-dragging\] \.ma \*[\s\S]*animation-play-state: paused/);
    expect(read('./Editor.tsx')).toContain("data-dragging={active ? '' : undefined}");
  });

  it('measures drop targets once per drag, not on every move', () => {
    expect(read('./Editor.tsx')).toContain('MeasuringStrategy.BeforeDragging');
  });
});
