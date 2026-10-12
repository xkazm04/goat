import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { GAMES_BY_YEAR } from './seed-yearly-games';

/**
 * update_games_images.sql paints a local cover onto an item by name. Two
 * things can go quietly wrong, and nothing checked either until 2026-09-05:
 *
 *   1. A LIKE pattern reaches a sibling title. Measured against the seed
 *      corpus (630 titles, 2005-2025): 2 of 55 statements matched more than
 *      one — '%Civilization%VI%' painted Civilization VI's cover onto
 *      Civilization VII, and '%GTA%V%' painted GTA V's onto Grand Theft Auto
 *      IV and GTA VI. Both are now exact matches; this test refuses a second
 *      hit for every statement.
 *   2. The path names a file that is not in public/games (a rename, a typo,
 *      a deleted asset). 55 of 55 exist today; a drift reddens this.
 *
 * Negative control (recorded 2026-09-05): against the pre-fix SQL the
 * over-match assertion listed exactly the two statements above.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const sql = readFileSync(path.join(here, 'update_games_images.sql'), 'utf8').replace(/--[^\n]*/g, '');

interface Statement {
  image: string;
  predicates: { op: '=' | 'LIKE'; value: string }[];
}

function statements(): Statement[] {
  const re = /image_url = '\/games\/((?:[^']|'')+)'[^;]*?WHERE category = 'games' AND (.*?);/gs;
  return Array.from(sql.matchAll(re), (m) => ({
    image: m[1].replace(/''/g, "'"),
    predicates: Array.from(m[2].matchAll(/LOWER\(name\) (=|LIKE) LOWER\('((?:[^']|'')+)'\)/g), (p) => ({
      op: p[1] as '=' | 'LIKE',
      value: p[2].replace(/''/g, "'"),
    })),
  }));
}

/** SQL LIKE (case-folded, as the statements wrap both sides in LOWER) -> RegExp. */
export function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped.replace(/%/g, '.*').replace(/_/g, '.') + '$', 's');
}

function matches(stmt: Statement, title: string): boolean {
  const t = title.toLowerCase();
  return stmt.predicates.some((p) => (p.op === '=' ? t === p.value.toLowerCase() : likeToRegExp(p.value).test(t)));
}

const corpus = Object.values(GAMES_BY_YEAR as Record<string, string[]>).flat();
const stmts = statements();

describe('db/scripts/update_games_images.sql', () => {
  it('parses a plausible population (every UPDATE has an image and at least one predicate)', () => {
    expect(stmts.length).toBeGreaterThanOrEqual(50);
    expect((sql.match(/UPDATE public\.items/g) ?? []).length).toBe(stmts.length);
    for (const s of stmts) expect(s.predicates.length, s.image).toBeGreaterThan(0);
    expect(corpus.length).toBe(630);
  });

  it('every referenced cover exists in public/games, and every cover there is referenced', () => {
    const files = readdirSync(path.join(repoRoot, 'public', 'games'));
    const referenced = stmts.map((s) => s.image);
    expect(referenced.filter((f) => !files.includes(f))).toEqual([]);
    expect(files.filter((f) => !referenced.includes(f))).toEqual([]);
  });

  it('no statement matches more than one title of the seed corpus', () => {
    const over = stmts
      .map((s) => ({ image: s.image, hits: corpus.filter((t) => matches(s, t)) }))
      .filter((x) => new Set(x.hits).size > 1)
      .map((x) => `${x.image} -> ${Array.from(new Set(x.hits)).join(' | ')}`);
    expect(over).toEqual([]);
  });

  it('the LIKE translation itself is faithful (so a clean run above means something)', () => {
    expect(likeToRegExp('%Civilization%VI%').test('civilization vii')).toBe(true);
    expect(likeToRegExp('%GTA%V%').test('gta vi')).toBe(true);
    expect(likeToRegExp('%Half-Life%2%').test('half-life 2')).toBe(true);
    expect(likeToRegExp('%Half-Life%2%').test('half-life: alyx')).toBe(false);
    expect(likeToRegExp('Dota 2').test('dota 2')).toBe(true);
    expect(likeToRegExp('Dota 2').test('dota 21')).toBe(false);
  });
});
