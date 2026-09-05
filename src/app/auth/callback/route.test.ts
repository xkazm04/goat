import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The OAuth callback is the one route that turns an attacker-controllable
 * query string (`?next=`) into a redirect AFTER a successful sign-in — the
 * textbook open-redirect door. It is also the only place a failed code
 * exchange is observed, so a swallowed error there is a sign-in failure with
 * no server-side trace.
 *
 * Negative control (recorded 2026-09-05, before the fix): with
 * `NextResponse.redirect(`${origin}${next}`)` and no validation,
 *   - `?next=@evil.example`      redirected to host `evil.example` (userinfo trick)
 *   - `?next=https://evil.example` threw on URL construction (500, not a redirect)
 *   - `?next=//evil.example`    was passed through as the path `//evil.example`
 *   - a failed exchange redirected with `console.error` called 0 times
 *   - a missing code redirected with nothing logged
 * 5 of the 6 cases below were red.
 */

const exchangeCodeForSession = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}));

const ORIGIN = 'https://goat.test';

async function callback(query: string) {
  const { GET } = await import('./route');
  return GET(new Request(`${ORIGIN}/auth/callback${query}`));
}

function location(res: Response): URL {
  const loc = res.headers.get('location');
  if (!loc) throw new Error('no Location header');
  return new URL(loc);
}

describe('GET /auth/callback', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('follows a same-origin absolute path in `next`', async () => {
    const res = await callback('?code=abc&next=/lists?tab=mine');
    expect(res.status).toBe(307);
    const url = location(res);
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname + url.search).toBe('/lists?tab=mine');
  });

  it('does not let `next=@host` move the redirect to another origin', async () => {
    const res = await callback('?code=abc&next=@evil.example');
    expect(location(res).origin).toBe(ORIGIN);
    expect(location(res).host).not.toContain('evil.example');
  });

  it('does not follow an absolute URL in `next`, and does not throw on it', async () => {
    const res = await callback('?code=abc&next=https://evil.example/steal');
    expect(res.status).toBe(307);
    expect(location(res).origin).toBe(ORIGIN);
    expect(location(res).pathname).toBe('/');
  });

  it('does not follow a scheme-relative `//host` in `next`', async () => {
    const res = await callback('?code=abc&next=//evil.example');
    expect(location(res).origin).toBe(ORIGIN);
    expect(location(res).pathname).toBe('/');
  });

  it('logs the exchange error before redirecting to the auth_error landing', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid grant' } });
    const res = await callback('?code=bad');
    const url = location(res);
    expect(url.origin).toBe(ORIGIN);
    expect(url.searchParams.get('auth_error')).toBe('true');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0].join(' '))).toContain('invalid grant');
  });

  it('records a callback that arrived without a code', async () => {
    const res = await callback('');
    expect(location(res).searchParams.get('auth_error')).toBe('true');
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
