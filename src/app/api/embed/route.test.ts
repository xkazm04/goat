/**
 * /api/embed — the widget iframe route.
 *
 * Registry: public-verdict-badge/embed-snippet-contract (the snippet pins a
 * config the server can always render), customization-scope-guard; _laws
 * one-validation-door.
 *
 * Negative control (recorded 2026-09-05, before `normalizeWidgetConfig` was
 * wired into this route's parser): `?size=huge` threw
 * `Cannot read properties of undefined (reading 'width')` out of GET — the
 * first test below was RED. The lib's own parser had been fixed the same day;
 * this route kept its own copy of the cast.
 */
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route';

const get = (qs: string) => GET(new NextRequest(`http://localhost/api/embed?${qs}`));

describe('/api/embed config door', () => {
  it('renders with defaults when size / theme / display are outside the vocabulary', async () => {
    const res = await get('id=list-1&size=huge&theme=neon&display=carousel&count=abc');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('goat-widget--standard');
    expect(html).not.toContain('goat-widget--huge');
  });

  it('still refuses a request with no id', async () => {
    const res = await get('size=compact');
    expect(res.status).toBe(400);
  });

  it('links the CTA to the share URL exactly once (no doubled origin)', async () => {
    const res = await get('id=list-1');
    const html = await res.text();
    const hrefs = Array.from(html.matchAll(/href="([^"]+)"/g)).map((m) => m[1]);
    const cta = hrefs.find((h) => h.includes('/share/'));
    expect(cta).toBeDefined();
    expect((cta!.match(/https?:\/\//g) ?? []).length).toBe(1);
    expect(cta).toMatch(/^https?:\/\/[^/]+\/share\/list-1$/);
    // The click handler on interactive items opens the same URL.
    const onclick = html.match(/window\.open\(&quot;([^&]+)&quot;/)?.[1];
    expect(onclick).toBe(cta);
  });

  it('never places the raw id inside the inline script or an attribute', async () => {
    // A quote closes the JS string literal; </script> closes the block.
    const payload = `x'</script><img src=x onerror=alert(1)>`;
    const res = await get(`id=${encodeURIComponent(payload)}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain(payload);
    expect(html).not.toContain('<img src=x onerror');
    // The postMessage still carries the id, as a JSON literal.
    expect(html).toContain(`listId: ${JSON.stringify(payload).replace(/</g, '\\u003c')}`);
  });
});
