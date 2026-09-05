import { describe, expect, it } from 'vitest';

import { assertTargetAllowed, connectionStringFromEnv, ENV_KEYS, REMOTE_FLAG, resolveConnectionString } from './connection';

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

/**
 * The remote guard, mirrored from scripts/seed-e2e.ts.
 *
 * Negative control (recorded 2026-09-05, before the fix): all three scripts
 * connected to `aws-0-eu-central-1.pooler.supabase.com` with no flag and no
 * check — 3 of 3 remote, 0 of 3 guarded.
 */
describe('assertTargetAllowed', () => {
  const remote = 'postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';

  it('lets a local host through without any flag', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      const url = `postgresql://u:p@${host}:54322/postgres`;
      expect(assertTargetAllowed(url, {})).toBe(url);
    }
  });

  it('refuses a remote host unless DB_SCRIPTS_ALLOW_REMOTE=1, naming the host and the flag', () => {
    expect(() => assertTargetAllowed(remote, {})).toThrow(/aws-0-eu-central-1\.pooler\.supabase\.com/);
    expect(() => assertTargetAllowed(remote, {})).toThrow(new RegExp(REMOTE_FLAG));
    expect(() => assertTargetAllowed(remote, { [REMOTE_FLAG]: 'true' })).toThrow(); // only the literal "1"
    expect(assertTargetAllowed(remote, { [REMOTE_FLAG]: '1' })).toBe(remote);
  });

  it('refuses an unparseable URL rather than treating it as local', () => {
    expect(() => assertTargetAllowed('not a url', {})).toThrow(/parseable/);
  });

  it('resolveConnectionString applies both doors in order', () => {
    expect(() => resolveConnectionString({})).toThrow(/DATABASE_URL/);
    expect(() => resolveConnectionString({ DATABASE_URL: remote })).toThrow(new RegExp(REMOTE_FLAG));
    expect(resolveConnectionString({ DATABASE_URL: remote, [REMOTE_FLAG]: '1' })).toBe(remote);
    expect(resolveConnectionString({ DATABASE_URL: 'postgresql://u:p@localhost/db' })).toBe('postgresql://u:p@localhost/db');
  });
});
