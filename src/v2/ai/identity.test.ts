import { describe, expect, it } from 'vitest';

import { candidateKey, titleKey } from './candidate';
import { newGaps } from './gaps';

import type { ListSnapshot } from './snapshot';

// One identity for a title. Gaps, recommendations and in-request dedupe each
// kept their own normaliser; they disagreed on diacritics and on non-Latin titles.
const c = (title: string, year = 1990) => ({
  title,
  year,
  creator: null,
  why: 'w',
  traits: ['t'],
  art: { hues: [1, 100] as [number, number], motif: 'sun' as const },
});

const snap = (titles: string[]): ListSnapshot => ({
  title: 't',
  topic: 'x',
  size: 10,
  ranked: titles.map((title, i) => ({ id: `r${i}`, title, year: 2000, creator: null, note: '' })),
  pool: [],
});

describe('one identity for a title', () => {
  it('treats a diacritic spelling as the listed item', () => {
    expect(newGaps([c('Amelie')], snap(['Amélie']))).toEqual([]);
  });

  it('does not let a non-Latin listed title swallow every other non-Latin suggestion', () => {
    const out = newGaps([c('千と千尋の神隠し', 2001), c('Dune')], snap(['七人の侍']));
    expect(out.map((o) => o.title)).toEqual(['千と千尋の神隠し', 'Dune']);
  });

  it('keeps two non-Latin titles of one year apart within a request', () => {
    const out = newGaps([c('千と千尋の神隠し', 2001), c('もののけ姫', 2001)], snap(['Alien']));
    expect(out).toHaveLength(2);
  });

  it('titleKey is the one key candidateKey is built on', () => {
    expect(titleKey('Café Müller!')).toBe('cafe-muller');
    expect(titleKey('Amélie')).toBe(titleKey('amelie'));
    expect(candidateKey({ title: 'Café Müller!', year: 1985 })).toBe(`c-${titleKey('Café Müller!')}-1985`);
    expect(titleKey('千と千尋の神隠し')).not.toBe(titleKey('もののけ姫'));
  });
});
