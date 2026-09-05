/**
 * parseListQuery — the natural-language door for "new …" in the command palette.
 *
 * Two populations are pinned here:
 *  - the YEAR read: a bare four-digit year in the query must be the year the
 *    list is about, never the wall clock;
 *  - the hand-maintained keyword tables must name categories and subcategories
 *    that CATEGORY_CONFIG actually declares (the vocabulary the parser feeds
 *    into createListIntent).
 *
 * Negative control (recorded 2026-09-05, scan-sweep command-palette): against
 * the pre-fix parser — `thisYear: /this year|current year|2024|2025/` — the
 * example query "top 50 songs 2024" parsed to year = <current year>, and
 * "best 10 soccer players 2019" to timePeriod 'all-time' — 6 of 9 cases red
 * (the 2 vocabulary cases only because the tables were not yet exported; once
 * exported they were green, so there is no keyword drift today). 9/9 after.
 */
import { describe, expect, it } from 'vitest';

import { CATEGORY_CONFIG } from '@/lib/config/category-config';

import {
  CATEGORY_KEYWORDS,
  SUBCATEGORY_KEYWORDS,
  generateListTitle,
  getExampleQueries,
  parseListQuery,
} from './parseListQuery';

const THIS_YEAR = new Date().getFullYear();

describe('parseListQuery — year and decade', () => {
  it('reads a bare year in the query as the list year, not the current year', () => {
    const p = parseListQuery('top 50 songs 2024');
    expect(p.timePeriod).toBe('year');
    expect(p.year).toBe('2024');
  });

  it('reads any plausible bare year, not only the ones a regex was born with', () => {
    const p = parseListQuery('best 10 soccer players 2019');
    expect(p.timePeriod).toBe('year');
    expect(p.year).toBe('2019');
  });

  it('"this year" resolves to the wall clock', () => {
    const p = parseListQuery('top 5 albums this year');
    expect(p.timePeriod).toBe('year');
    expect(p.year).toBe(String(THIS_YEAR));
  });

  it('a decade suffix wins over a year read', () => {
    const p = parseListQuery('best 10 soccer players 2020s');
    expect(p.timePeriod).toBe('decade');
    expect(p.decade).toBe('2020');
    expect(p.year).toBeUndefined();
  });

  it('"recent" / "modern" mean the current decade, not a pinned one', () => {
    const p = parseListQuery('top 10 modern games');
    expect(p.timePeriod).toBe('decade');
    expect(p.decade).toBe(String(Math.floor(THIS_YEAR / 10) * 10));
  });

  it('every shipped example query parses to the period its words name', () => {
    const periods = getExampleQueries().map((q) => {
      const p = parseListQuery(q);
      return `${q} -> ${p.timePeriod}${p.year ? ` ${p.year}` : ''}${p.decade ? ` ${p.decade}s` : ''}`;
    });
    expect(periods).toEqual([
      'top 10 basketball all-time -> all-time',
      'best 25 NBA players -> all-time',
      'top 50 songs 2024 -> year 2024',
      'greatest 10 video games ever -> all-time',
      'top 20 movies all time -> all-time',
      'best 10 soccer players 2020s -> decade 2020s',
      `top 5 albums this year -> year ${THIS_YEAR}`,
    ]);
  });
});

describe('parseListQuery — vocabulary is derived from CATEGORY_CONFIG', () => {
  it('every category keyword table names a declared category', () => {
    const declared = Object.keys(CATEGORY_CONFIG);
    for (const category of Object.keys(CATEGORY_KEYWORDS)) {
      expect(declared, `CATEGORY_KEYWORDS names "${category}"`).toContain(category);
    }
  });

  it('every subcategory keyword table names a declared subcategory of a category that has them', () => {
    const declared = Object.values(CATEGORY_CONFIG)
      .filter((c) => c.hasSubcategories)
      .flatMap((c) => c.subcategories.map((s) => s.value));
    for (const sub of Object.keys(SUBCATEGORY_KEYWORDS)) {
      expect(declared, `SUBCATEGORY_KEYWORDS names "${sub}"`).toContain(sub);
    }
  });

  it('generateListTitle spells the parsed period', () => {
    expect(generateListTitle(parseListQuery('top 10 basketball all-time'))).toBe('Top 10 Sports - Basketball (All-Time)');
    expect(generateListTitle(parseListQuery('top 50 songs 2024'))).toBe('Top 50 Music (2024)');
  });
});
