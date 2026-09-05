import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ShowcaseDecor from './ShowcaseDecor';

/**
 * Render contract for the landing hero's decorative background layer.
 *
 * Negative controls (recorded 2026-09-05, before the fixes these pin): with
 * `alt="GOAT Background"` the alt assertion failed on that literal; with
 * `priority` set, the markup opened with `<link rel="preload" as="image"
 * imageSrcSet="/_next/image?url=%2Fgoat.png…"` and the preload assertion
 * failed on it. Both red-then-green.
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

  it('does not preload the 1 MB watermark ahead of the page content', () => {
    // `priority` on next/image hoists a <link rel="preload" as="image"> for
    // public/goat.png (1,063,718 bytes) to the head of the landing response,
    // competing with the text and lists for a layer painted at opacity 0.05
    // behind a 5-second fade.
    expect(html).not.toMatch(/<link[^>]*rel="preload"/);
    expect(html).not.toMatch(/fetchpriority="high"/i);
  });
});
