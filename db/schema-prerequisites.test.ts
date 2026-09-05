import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Every function, type and table that the in-tree SQL REFERENCES must be
 * DEFINED by in-tree SQL — or be named here, with the reason, as an external
 * prerequisite. Measured 2026-09-05: db/*.sql (the four core tables) depends
 * on three things no file in this repository creates, so a fresh database
 * cannot be built from the tree, and nothing said so:
 *
 *   category_enum          the enum items/item_groups/lists are typed on
 *   users                  referenced by lists_user_id_fkey and 5 migrations
 *   rerank_list_items()    the trigger function on list_items — only ever
 *                          mentioned in a comment of 20260322000001
 *
 * (registry: migrations / schema-drift-detection — two roads to one schema,
 * and this repo's fresh-install road has holes the upgrade road never sees.)
 *
 * Both directions are pinned, like src/types/database-schema-coverage.test.ts:
 * a new unresolved reference reddens the first assertion; a prerequisite that
 * gains in-tree DDL reddens the second, so the allowlist cannot rot.
 *
 * Negative control (recorded 2026-09-05): a seeded db/zz_probe.sql with
 * `execute FUNCTION phantom_fn ()` turned the first assertion red
 * (`phantom_fn` listed); deleting it turned it green.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

/** Names the tree references but does not define. Each carries its reason. */
const EXTERNAL_PREREQUISITES: Record<string, string> = {
  category_enum: 'Postgres enum created in the Supabase dashboard; its labels are not recorded in-tree',
  users: 'created outside the migrations lane (Supabase auth-era table); scripts/seed-e2e.ts upserts into it',
  rerank_list_items: 'trigger function on list_items, defined only in the live database',
};

function sqlFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.sql')) out.push(p);
    }
  };
  for (const d of ['db', 'supabase/migrations']) {
    try { walk(path.join(repoRoot, d)); } catch { /* absent dir is not a definition */ }
  }
  return out.sort();
}

const norm = (name: string) => name.toLowerCase().replace(/^public\./, '').replace(/"/g, '');

function scan() {
  const defined = new Set<string>();
  const referenced = new Map<string, Set<string>>(); // name -> files
  const ref = (name: string, file: string) => {
    const n = norm(name);
    if (n.startsWith('auth.') || n.startsWith('extensions.') || n.startsWith('storage.')) return; // Supabase-provided schemas
    if (!referenced.has(n)) referenced.set(n, new Set());
    referenced.get(n)!.add(path.relative(repoRoot, file).replace(/\\/g, '/'));
  };
  for (const f of sqlFiles()) {
    const sql = readFileSync(f, 'utf8').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of sql.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/gi)) defined.add(norm(m[1]));
    for (const m of sql.matchAll(/\bcreate\s+type\s+([\w."]+)/gi)) defined.add(norm(m[1]));
    for (const m of sql.matchAll(/\bcreate\s+(?:or\s+replace\s+)?function\s+([\w."]+)/gi)) defined.add(norm(m[1]));
    for (const m of sql.matchAll(/\bcreate\s+(?:or\s+replace\s+)?view\s+([\w."]+)/gi)) defined.add(norm(m[1]));
    for (const m of sql.matchAll(/\bexecute\s+(?:function|procedure)\s+([\w."]+)\s*\(/gi)) ref(m[1], f);
    for (const m of sql.matchAll(/\breferences\s+([\w."]+)\s*\(/gi)) ref(m[1], f);
    for (const m of sql.matchAll(/\b([\w.]+_enum)\b/gi)) ref(m[1], f);
  }
  return { defined, referenced };
}

describe('in-tree SQL: every reference is defined in-tree or is a named external prerequisite', () => {
  const { defined, referenced } = scan();

  it('reads a plausible population', () => {
    expect(sqlFiles().length).toBeGreaterThanOrEqual(20);
    expect(defined.size).toBeGreaterThan(10);
    expect(referenced.size).toBeGreaterThan(5);
  });

  it('every unresolved reference is on the allowlist with a reason', () => {
    const unresolved = Array.from(referenced.keys()).filter((n) => !defined.has(n)).sort();
    expect(unresolved).toEqual(Object.keys(EXTERNAL_PREREQUISITES).sort());
    for (const [name, why] of Object.entries(EXTERNAL_PREREQUISITES)) expect(why.length, name).toBeGreaterThan(10);
  });

  it('the allowlist names nothing the tree now defines', () => {
    expect(Object.keys(EXTERNAL_PREREQUISITES).filter((n) => defined.has(n))).toEqual([]);
  });

  it('names where each prerequisite is needed, so the README can stay honest', () => {
    // db/*.sql is the fresh-install road; each of the three is needed there.
    for (const name of Object.keys(EXTERNAL_PREREQUISITES)) {
      const files = Array.from(referenced.get(name) ?? []);
      expect(files.some((f) => f.startsWith('db/')), `${name} referenced from db/`).toBe(true);
    }
  });
});
