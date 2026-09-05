import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Resolve the post-login destination from the untrusted `next` query param.
 *
 * Only a same-origin path is honoured. Everything else — an absolute URL, a
 * scheme-relative `//host`, a `@host` userinfo trick, a backslash variant the
 * browser would normalise into one of those — falls back to `/`. The check is
 * done by letting the URL parser resolve `next` against our origin and then
 * comparing origins, so it is the parser's opinion, not a regex's.
 */
function resolveNextPath(next: string | null, origin: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/';
  }
  try {
    const target = new URL(next, origin);
    if (target.origin !== origin) return '/';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/';
  }
}

/**
 * OAuth callback route -- exchanges authorization code for a session.
 *
 * After Google redirects back to the app, this route:
 * 1. Reads the `code` parameter from the URL
 * 2. Exchanges it for a Supabase session via the server client (with cookies)
 * 3. Redirects to the `next` parameter (default: '/'), same-origin paths only
 *
 * On error, logs the cause server-side and redirects to `/?auth_error=true`.
 * The log line is the only record a failed sign-in leaves; the redirect alone
 * cannot say whether the code was missing, expired, or rejected.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = resolveNextPath(searchParams.get('next'), origin);

  if (!code) {
    console.warn('[auth/callback] callback reached without a code parameter');
    return NextResponse.redirect(new URL('/?auth_error=true', origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] code exchange failed:', error.message);
    return NextResponse.redirect(new URL('/?auth_error=true', origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
