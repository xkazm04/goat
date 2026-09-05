import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The migration chain, read as a chain.
 *
 * `supabase/migrations/*.sql` is applied in filename order by the Supabase CLI,
 * once per step, against a database that already carries the base tables from
 * `db/*.sql` (lists, items, item_groups, list_items — created outside this
 * lane, together with `users` and `category_enum`). Nothing in the repo read
 * the chain AS a chain before 2026-09-05: each file was reviewed on its own,
 * and the defects this test pins are exactly the ones invisible per file —
 * a name a later step re-creates, a table two steps define differently, a
 * `SELECT *` view frozen before its base table grew, a table the code queries
 * that no step creates.
 *
 * There is no Postgres in the test environment (docker daemon down, no psql,
 * no supabase CLI), so this is a static read of the SQL text, not a replay.
 * Every predicate below says what it counts. The replay itself — build a
 * database from db/*.sql + this chain and diff it against production — is the
 * instrument this test stands in for, and is recorded as the missing one
 * (registry: migrations / schema-drift-detection, "the convergence test").
 *
 * Negative controls (recorded 2026-09-05 against the chain at 5decd9d, before
 * any fix): duplicate-name 4, two-definitions 1 (blueprints.author_id UUID vs
 * TEXT), stale-view 2 (top_items, top_groups), undefined-table 1
 * (ranking_submissions), definer-hardening 1 (replace_list_items). Each was
 * pinned with `it.fails` and flipped to `it` by the commit that fixed it.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

interface Statement { file: string; sql: string; index: number }

/** Split SQL into statements on `;`, honouring `$$ ... $$` bodies and quotes. */
function splitStatements(file: string, raw: string): Statement[] {
  const src = raw.replace(/--[^\n]*/g, '');
  const out: Statement[] = [];
  let buf = '';
  let inDollar = false;
  let inQuote: string | null = null;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const two = src.slice(i, i + 2);
    if (!inQuote && two === '$$') { inDollar = !inDollar; buf += two; i++; continue; }
    if (!inDollar) {
      if (inQuote) { if (ch === inQuote) inQuote = null; }
      else if (ch === "'" || ch === '"') inQuote = ch;
      else if (ch === ';') {
        const sql = buf.replace(/\s+/g, ' ').trim();
        if (sql) out.push({ file, sql, index: out.length });
        buf = '';
        continue;
      }
    }
    buf += ch;
  }
  const tail = buf.replace(/\s+/g, ' ').trim();
  if (tail) out.push({ file, sql: tail, index: out.length });
  return out;
}

function chainFiles(): string[] {
  return readdirSync(here).filter((n) => n.endsWith('.sql')).sort();
}

function chainStatements(): Statement[] {
  return chainFiles().flatMap((f) => splitStatements(f, readFileSync(path.join(here, f), 'utf8')));
}

/** Every SQL file in the tree that can define a relation, chain last. */
function allSqlStatements(): Statement[] {
  const dirs = ['db', 'db/migrations'];
  const out: Statement[] = [];
  for (const d of dirs) {
    const abs = path.join(repoRoot, d);
    let names: string[] = [];
    try { names = readdirSync(abs).filter((n) => n.endsWith('.sql')).sort(); } catch { continue; }
    for (const n of names) out.push(...splitStatements(`${d}/${n}`, readFileSync(path.join(abs, n), 'utf8')));
  }
  return [...out, ...chainStatements()];
}

const ident = (s: string) => s.replace(/^public\./i, '').replace(/"/g, '').toLowerCase();

describe('supabase/migrations — the chain read as a chain', () => {
  const chain = chainStatements();

  it('applies in filename order and every file carries a sortable timestamp prefix', () => {
    const files = chainFiles();
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) expect(f).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  it.fails('a policy or trigger name is created once per table unless a DROP … IF EXISTS precedes the re-creation', () => {
    // A fresh database replays every step; CREATE POLICY / CREATE TRIGGER have
    // no IF NOT EXISTS form, so a re-used name aborts the chain at that step —
    // an error a production database that skipped the earlier step never saw.
    const live = new Set<string>();
    const dupes: string[] = [];
    for (const st of chain) {
      const sql = st.sql;
      let m = /^DROP POLICY IF EXISTS "?([^"]+?)"? ON ([a-z_."]+)/i.exec(sql);
      if (m) { live.delete(`policy:${ident(m[2])}:${m[1].toLowerCase()}`); continue; }
      m = /^DROP TRIGGER IF EXISTS ([a-z_"]+) ON ([a-z_."]+)/i.exec(sql);
      if (m) { live.delete(`trigger:${ident(m[2])}:${ident(m[1])}`); continue; }
      m = /^CREATE POLICY "?([^"]+?)"? ON ([a-z_."]+)/i.exec(sql);
      if (m) {
        const key = `policy:${ident(m[2])}:${m[1].toLowerCase()}`;
        if (live.has(key)) dupes.push(`${st.file}: ${key}`);
        live.add(key);
        continue;
      }
      m = /^CREATE TRIGGER ([a-z_"]+) .*? ON ([a-z_."]+)/i.exec(sql);
      if (m) {
        const key = `trigger:${ident(m[2])}:${ident(m[1])}`;
        if (live.has(key)) dupes.push(`${st.file}: ${key}`);
        live.add(key);
      }
    }
    expect(dupes).toEqual([]);
  });

  it.fails('a table CREATE TABLE IF NOT EXISTS defines twice has one column definition', () => {
    // Two definitions of one table are two authorities for its shape; the
    // guarded second one silently skips, so whichever step a given database
    // ran first decides the shape it has (registry: schema-drift-detection,
    // class 1 — two roads must arrive at one schema).
    const defs = new Map<string, { file: string; cols: string[] }[]>();
    for (const st of chain) {
      const m = /^CREATE TABLE (?:IF NOT EXISTS )?([a-z_."]+) \((.*)\)$/i.exec(st.sql);
      if (!m) continue;
      const cols = splitTopLevel(m[2]).map(normalizeColumn);
      const list = defs.get(ident(m[1])) ?? [];
      list.push({ file: st.file, cols });
      defs.set(ident(m[1]), list);
    }
    const disagreements: string[] = [];
    for (const [table, list] of defs) {
      if (list.length < 2) continue;
      const [first, ...rest] = list;
      for (const other of rest) {
        const a = new Set(first.cols);
        const b = new Set(other.cols);
        const onlyA = first.cols.filter((c) => !b.has(c));
        const onlyB = other.cols.filter((c) => !a.has(c));
        if (onlyA.length || onlyB.length) {
          disagreements.push(`${table}: ${first.file} has [${onlyA.join('; ')}] vs ${other.file} has [${onlyB.join('; ')}]`);
        }
      }
    }
    expect(disagreements).toEqual([]);
  });

  it.fails('a SELECT * view is re-created after its base table last gained a column', () => {
    // Postgres expands `*` when the view is CREATED. A column added to the base
    // table afterwards does not exist on the view, and a route that selects it
    // through the view fails on every call.
    const views: { view: string; base: string; at: number }[] = [];
    const adds: { table: string; at: number }[] = [];
    chain.forEach((st, at) => {
      let m = /^CREATE (?:OR REPLACE )?VIEW ([a-z_."]+) AS SELECT \* FROM ([a-z_."]+)$/i.exec(st.sql);
      if (m) { views.push({ view: ident(m[1]), base: ident(m[2]), at }); return; }
      m = /^ALTER TABLE ([a-z_."]+) ADD COLUMN/i.exec(st.sql);
      if (m) adds.push({ table: ident(m[1]), at });
    });
    const stale: string[] = [];
    const lastCreate = new Map<string, { base: string; at: number }>();
    for (const v of views) lastCreate.set(v.view, { base: v.base, at: v.at });
    for (const [view, { base, at }] of lastCreate) {
      const later = adds.filter((a) => a.table === base && a.at > at);
      if (later.length) stale.push(`${view} (created at step ${at}) misses ${later.length} column(s) added to ${base} later`);
    }
    expect(stale).toEqual([]);
  });

  it.fails('every table the application queries is created by SQL in the tree, or is allowlisted with a reason', () => {
    // A query is a string no compiler checks against the schema (registry:
    // schema-drift-detection, class 2). This is the compile step.
    const ALLOW: Record<string, string> = {
      users: 'created outside the migrations lane; referenced by lists_user_id_fkey in db/lists.sql',
    };
    const defined = new Set<string>();
    for (const st of allSqlStatements()) {
      const m = /^CREATE (?:TABLE|(?:OR REPLACE )?VIEW) (?:IF NOT EXISTS )?([a-z_."]+)/i.exec(st.sql);
      if (m) defined.add(ident(m[1]));
    }
    const queried = new Set<string>();
    const walk = (dir: string) => {
      for (const n of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, n.name);
        if (n.isDirectory()) { if (n.name !== 'node_modules') walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(n.name) || /\.test\.tsx?$/.test(n.name)) continue;
        const src = readFileSync(p, 'utf8');
        for (const m of src.matchAll(/\.from\(['"]([a-z_]+)['"]/g)) queried.add(m[1]);
      }
    };
    walk(path.join(repoRoot, 'src'));
    const missing = [...queried].filter((t) => !defined.has(t) && !(t in ALLOW)).sort();
    expect(missing).toEqual([]);
    // The allowlist may not rot into covering tables that gained DDL.
    for (const t of Object.keys(ALLOW)) expect(defined.has(t), `${t} now has DDL — drop it from ALLOW`).toBe(false);
  });

  it.fails('a SECURITY DEFINER function pins search_path and revokes PUBLIC execute', () => {
    // A definer function runs as its owner. Without SET search_path it resolves
    // unqualified names through the caller's path; without a REVOKE it is
    // callable by every PostgREST role, anon included.
    const last = new Map<string, Statement>();
    for (const st of chain) {
      const m = /^CREATE (?:OR REPLACE )?FUNCTION ([a-z_."]+)\s*\(/i.exec(st.sql);
      if (m) last.set(ident(m[1]), st);
    }
    const revoked = new Set<string>();
    for (const st of chain) {
      const m = /^REVOKE (?:ALL|EXECUTE)(?: PRIVILEGES)?(?: ON FUNCTION)? ON FUNCTION ([a-z_."]+)|^REVOKE (?:ALL|EXECUTE)(?: PRIVILEGES)? ON FUNCTION ([a-z_."]+)/i.exec(st.sql);
      const name = m?.[1] ?? m?.[2];
      if (name && /FROM (?:PUBLIC|anon)/i.test(st.sql)) revoked.add(ident(name));
    }
    const unhardened: string[] = [];
    for (const [name, st] of last) {
      if (!/SECURITY DEFINER/i.test(st.sql)) continue;
      const problems: string[] = [];
      if (!/SET search_path/i.test(st.sql)) problems.push('no SET search_path');
      if (!revoked.has(name)) problems.push('no REVOKE … FROM PUBLIC/anon');
      if (problems.length) unhardened.push(`${name} (${st.file}): ${problems.join(', ')}`);
    }
    expect(unhardened).toEqual([]);
  });
});

/** Split on top-level commas (depth 0 of parentheses). */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** Normalise a column or constraint definition so spelling variants compare equal. */
function normalizeColumn(c: string): string {
  return c
    .toLowerCase()
    .replace(/\bpublic\./g, '')
    .replace(/timestamp with time zone/g, 'timestamptz')
    .replace(/\bnow\(\)/g, 'now()')
    .replace(/\s+/g, ' ')
    .trim();
}
