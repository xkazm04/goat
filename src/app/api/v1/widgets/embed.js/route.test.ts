/**
 * GET /api/v1/widgets/embed.js — the script third-party sites load.
 *
 * The body is a hand-authored template string with no build step, so nothing
 * else in the repo would notice a syntax error, a dead deep link or a missing
 * state until a partner page broke. This file is that notice.
 *
 * Negative control (recorded 2026-09-05, before the fix): the two "no 404 deep
 * link" cases and the empty-state case were RED — the script linked to
 * `/explore/<category>` and `/item/<id>`, neither of which exists under
 * src/app, and rendered an empty <ul> under a "Top 0" header.
 */
import { NextRequest } from 'next/server';
import { describe, it, expect } from 'vitest';

import { GET } from './route';

async function script() {
  const res = await GET(new NextRequest('http://localhost/api/v1/widgets/embed.js'));
  expect(res.status).toBe(200);
  return { res, text: await res.text() };
}

describe('embed.js', () => {
  it('serves a script that parses as JavaScript', async () => {
    const { text } = await script();
    // Parse only — the script touches window/document when run.
    expect(() => new Function(text)).not.toThrow();
  });

  it('does not deep-link to routes this app does not have', async () => {
    const { text } = await script();
    expect(text).not.toMatch(/baseUrl \+ '\/explore\//);
    expect(text).not.toMatch(/baseUrl \+ '\/item\//);
  });

  it('renders an explicit empty state instead of an empty list', async () => {
    const { text } = await script();
    expect(text).toContain("'goat-widget-empty'");
    expect(text).toContain('No rankings yet');
  });

  it('is publicly cacheable without a per-origin CORS header', async () => {
    // Negative control (2026-09-05): the GET echoed the request Origin into
    // Access-Control-Allow-Origin under `Cache-Control: public` with no Vary,
    // so this case was RED with Origin: https://partner.example.
    const res = await GET(
      new NextRequest('http://localhost/api/v1/widgets/embed.js', {
        headers: { origin: 'https://partner.example' },
      })
    );
    const acao = res.headers.get('access-control-allow-origin');
    const cache = res.headers.get('cache-control') ?? '';
    const vary = res.headers.get('vary') ?? '';
    if (cache.includes('public')) {
      expect(acao === '*' || /\borigin\b/i.test(vary)).toBe(true);
    }
    expect(acao).toBe('*');
  });
});
