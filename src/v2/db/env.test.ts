import { describe, expect, it } from 'vitest';

import { readPublicEnv } from './env';

describe('readPublicEnv', () => {
  it('returns the settings when both are present and well formed', () => {
    const env = readPublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-that-is-long-enough',
    });
    expect(env?.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
  });

  it('returns null when a setting is missing, so /v2 can render offline', () => {
    expect(readPublicEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' })).toBeNull();
    expect(readPublicEnv({})).toBeNull();
  });

  it('returns null for a malformed URL rather than passing it on', () => {
    expect(
      readPublicEnv({ NEXT_PUBLIC_SUPABASE_URL: 'not a url', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-that-is-long-enough' }),
    ).toBeNull();
  });
});
