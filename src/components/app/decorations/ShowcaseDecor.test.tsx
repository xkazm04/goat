import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ShowcaseDecor from './ShowcaseDecor';

/**
 * Render contract for the landing hero's decorative background layer.
 *
 * Negative control (recorded 2026-09-05, before the fix this pins): with
 * `alt="GOAT Background"` the alt assertion failed on the literal
 * `alt="GOAT Background"`. Red-then-green.
 */
describe('ShowcaseDecor', () => {
  const html = renderToStaticMarkup(<ShowcaseDecor />);

  it('is invisible to assistive technology: empty alt and aria-hidden on every layer', () => {
    // A 5%-opacity brand watermark is decoration. An alt of "GOAT Background"
    // is announced by screen readers as an image with a name, on every landing
    // visit, for something that carries no information.
    expect(html).toMatch(/<img[^>]*\salt=""/);
    expect(html).not.toMatch(/alt="[^"]+"/);
    // Every top-level layer is hidden from the accessibility tree.
    const layers = html.match(/aria-hidden="true"/g) ?? [];
    expect(layers.length).toBeGreaterThanOrEqual(2);
  });

});
