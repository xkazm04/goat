import { readFileSync } from 'node:fs';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GoatFigure } from './Goat';
import { BODY, EAR, HORN_FAR, HORN_NEAR } from './goat-paths';
import { GoatBust } from './GoatBust';
import { scatter } from './Sparkles';
import { SUMMIT_STILL_SVG } from './summit-still';
import { SummitScene } from './SummitScene';
import { Vignette } from './Vignette';

describe('brand art', () => {
  it('keeps the generated still scene in step with SummitScene (run `npm run brand:assets` if this fails)', () => {
    expect(renderToStaticMarkup(<SummitScene still />)).toBe(SUMMIT_STILL_SVG);
  });

  it('keeps the favicon in step with the goat paths', () => {
    const icon = readFileSync(path.resolve(__dirname, '../../app/icon.svg'), 'utf8');
    for (const d of [BODY, EAR, HORN_NEAR, HORN_FAR]) expect(icon).toContain(d);
  });

  it('makes a still scene that needs no page CSS, fonts or scripts', () => {
    expect(SUMMIT_STILL_SVG).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(SUMMIT_STILL_SVG).not.toContain('var(--');
    expect(SUMMIT_STILL_SVG).not.toContain('<text');
    expect(SUMMIT_STILL_SVG).not.toContain('<script');
  });

  it('hides every piece of decorative art from assistive tech', () => {
    for (const el of [<SummitScene key="s" />, <Vignette key="v" label="1" />, <GoatBust key="b" />]) {
      expect(renderToStaticMarkup(el)).toContain('aria-hidden="true"');
    }
  });

  it('shows the label on the vignette step, so one art serves a card number and an empty state', () => {
    expect(renderToStaticMarkup(<Vignette label="007" />)).toContain('>007<');
    expect(renderToStaticMarkup(<Vignette label="?" />)).toContain('>?<');
  });

  it('keeps gradient ids unique per figure', () => {
    const a = renderToStaticMarkup(<svg><GoatFigure idPrefix="a" /></svg>);
    const b = renderToStaticMarkup(<svg><GoatFigure idPrefix="b" /></svg>);
    expect(a).toContain('id="a-rim"');
    expect(b).toContain('id="b-rim"');
  });

  it('scatters the same points every time', () => {
    const box = { x: 0, y: 0, w: 100, h: 100 };
    expect(scatter(5, box, 3)).toEqual(scatter(5, box, 3));
    expect(scatter(5, box, 3)).not.toEqual(scatter(5, box, 4));
  });
});
