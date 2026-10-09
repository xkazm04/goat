import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The goat_v2 schema's access rules, read from the SQL text.
 *
 * v1 leaned on `USING (true)` policies because guests had no session. v2 gives
 * every visitor a real auth.uid() (anonymous sign-in), so the rules below can
 * be strict: every goat_v2 table has RLS on and at least one policy, and no
 * policy that lets a caller WRITE is unconditional. Like chain.test.ts this is
 * a static read; there is no Postgres in the test environment.
 */

const here = path.dirname(fileURLToPath(import.meta.url));

function v2Sql(): string {
  return readdirSync(here)
    .filter((n) => n.endsWith('.sql'))
    .sort()
    .map((n) => readFileSync(path.join(here, n), 'utf8'))
    .join('\n')
    .replace(/--[^\n]*/g, '');
}

const sql = v2Sql();
const tables = [...sql.matchAll(/CREATE TABLE goat_v2\.([a-z_]+)/gi)].map((m) => m[1].toLowerCase());
const policies = [...sql.matchAll(/CREATE POLICY "[^"]+" ON goat_v2\.([a-z_]+)\s+FOR (SELECT|INSERT|UPDATE|DELETE|ALL)([\s\S]*?);/gi)].map(
  (m) => ({ table: m[1].toLowerCase(), command: m[2].toUpperCase(), body: m[3] }),
);

describe('goat_v2 schema access rules', () => {
  it('defines the tables the technical package names', () => {
    expect(tables.sort()).toEqual(
      ['ai_usage', 'items', 'list_entries', 'lists', 'profiles', 'recommendations', 'taste_profiles'],
    );
  });

  it('turns on row level security for every goat_v2 table', () => {
    const secured = new Set(
      [...sql.matchAll(/ALTER TABLE goat_v2\.([a-z_]+) ENABLE ROW LEVEL SECURITY/gi)].map((m) => m[1].toLowerCase()),
    );
    expect(tables.filter((t) => !secured.has(t))).toEqual([]);
  });

  it('gives every goat_v2 table at least one policy', () => {
    const covered = new Set(policies.map((p) => p.table));
    expect(tables.filter((t) => !covered.has(t))).toEqual([]);
  });

  it('never makes a write policy unconditional', () => {
    const open = policies.filter(
      (p) => p.command !== 'SELECT' && /(USING|WITH CHECK)\s*\(\s*true\s*\)/i.test(p.body),
    );
    expect(open.map((p) => `${p.table} ${p.command}`)).toEqual([]);
  });

  it('ties every owner-scoped write to auth.uid()', () => {
    const writes = policies.filter((p) => p.command !== 'SELECT');
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.filter((p) => !/auth\.uid\(\)/.test(p.body)).map((p) => `${p.table} ${p.command}`)).toEqual([]);
  });

  it('grants anon read access only', () => {
    const anonGrants = [...sql.matchAll(/GRANT ([A-Z, ]+) ON ALL TABLES IN SCHEMA goat_v2 TO ([a-z_, ]+);/g)]
      .filter((m) => m[2].split(',').map((s) => s.trim()).includes('anon'))
      .map((m) => m[1].trim());
    expect(anonGrants).toEqual(['SELECT']);
  });
});
