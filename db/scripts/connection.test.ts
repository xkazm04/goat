import { describe, expect, it } from 'vitest';

import { connectionStringFromEnv, ENV_KEYS } from './connection';

/**
 * The one door for the seed scripts' connection string.
 *
 * Negative control (recorded 2026-09-05, before the fix): the three scripts
 * carried the pooler URL as a literal, so there was no function to test and
 * `no-committed-credentials.test.ts` was red on 3 of 3 files.
 */
describe('connectionStringFromEnv', () => {
  it('reads DATABASE_URL first, SUPABASE_DB_URL second, trimmed', () => {
    expect(connectionStringFromEnv({ DATABASE_URL: ' postgresql://u:p@h/db ' })).toBe('postgresql://u:p@h/db');
    expect(connectionStringFromEnv({ SUPABASE_DB_URL: 'postgresql://u:p@h/db2' })).toBe('postgresql://u:p@h/db2');
    expect(
      connectionStringFromEnv({ DATABASE_URL: 'postgresql://first', SUPABASE_DB_URL: 'postgresql://second' }),
    ).toBe('postgresql://first');
    expect(ENV_KEYS).toEqual(['DATABASE_URL', 'SUPABASE_DB_URL']);
  });

  it('refuses to run with neither set — an empty value is not a value', () => {
    for (const env of [{}, { DATABASE_URL: '' }, { DATABASE_URL: '   ', SUPABASE_DB_URL: '' }]) {
      expect(() => connectionStringFromEnv(env)).toThrow(/DATABASE_URL or SUPABASE_DB_URL/);
    }
  });

  it('never falls back to a literal — the error names how to load the variable', () => {
    expect(() => connectionStringFromEnv({})).toThrow(/--env-file=\.env/);
  });
});
