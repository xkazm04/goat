import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GoatFigure } from './Goat';
import { BODY, EAR, HORN_FAR, HORN_NEAR } from './goat-paths';
import { GoatBust } from './GoatBust';
import { ModeArt } from './ModeArt';
import { scatter } from './Sparkles';
import { SUMMIT_STILL_SVG } from './summit-still';
import { SummitScene } from './SummitScene';
import { SunRays } from './SunRays';
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

  it('gives every editor mode its own decorative layer, hidden from assistive tech', () => {
    const marks = (['mosaic', 'canvas', 'stage'] as const).map((mode) => renderToStaticMarkup(<ModeArt mode={mode} />));
    for (const html of marks) {
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('class="ma ma-');
    }
    expect(new Set(marks).size).toBe(3);
    // The Spread's art is its plate (SpreadPlate), not a background layer.
    expect(renderToStaticMarkup(<ModeArt mode="spread" />)).toBe('');
  });

  it('varies the stage art by preset: goat on the podium, mountain for Rushmore, horns for the Throne', () => {
    const html = Object.fromEntries(
      (['podium', 'rushmore', 'throne'] as const).map((preset) => [preset, renderToStaticMarkup(<ModeArt mode="stage" preset={preset} />)]),
    );
    expect(html.podium).toContain('stage-goat.webp');
    expect(html.rushmore).toContain('stage-rushmore.webp');
    expect(html.throne.match(/<img[^>]*stage-horn\.webp/g)).toHaveLength(2);
    expect(html.podium).not.toContain('stage-rushmore');
    expect(html.rushmore).not.toContain('stage-goat');
  });

  it('only references art files that exist, and keeps every view under its byte budget', () => {
    const dir = path.resolve(__dirname, '../../../public/art');
    const referenced = new Set<string>();
    for (const [mode, preset] of [['mosaic'], ['canvas'], ['stage', 'podium'], ['stage', 'rushmore'], ['stage', 'throne']] as const) {
      const html = renderToStaticMarkup(<ModeArt mode={mode} preset={preset} />);
      for (const m of html.matchAll(/\/art\/([a-z0-9-]+\.webp)/g)) referenced.add(m[1]);
    }
    referenced.add('spread-plate.webp');
    referenced.add('grain.webp');
    let total = 0;
    for (const f of referenced) {
      expect(existsSync(path.join(dir, f)), f).toBe(true);
      total += statSync(path.join(dir, f)).size;
    }
    // All baked art together: well under the 3.5 MB the covers alone used to cost.
    expect(total).toBeLessThan(900 * 1024);
  });

  it('draws the sun rays from a fixed pattern, so server and client agree', () => {
    expect(renderToStaticMarkup(<SunRays size={100} />)).toBe(renderToStaticMarkup(<SunRays size={100} />));
    expect(renderToStaticMarkup(<SunRays size={100} />).match(/<line /g)).toHaveLength(72);
  });
});
