import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * OAuth callback route -- exchanges authorization code for a session.
 *
 * After Google redirects back to the app, this route:
 * 1. Reads the `code` parameter from the URL
 * 2. Exchanges it for a Supabase session via the server client (with cookies)
 * 3. Redirects to the `next` parameter (default: '/')
 *
 * On error, redirects to `/?auth_error=true`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error -- redirect to home with error indication
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
