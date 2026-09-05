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
});
