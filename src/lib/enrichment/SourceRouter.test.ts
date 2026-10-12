import { describe, expect, it } from 'vitest';

import { SourceRouter } from './SourceRouter';

describe('SourceRouter.normalizeCategory', () => {
  it('maps the aliases it declares', () => {
    expect(SourceRouter.normalizeCategory('films')).toBe('movies');
    expect(SourceRouter.normalizeCategory('TV Shows')).toBe('tv');
    expect(SourceRouter.normalizeCategory('video games')).toBe('games');
    expect(SourceRouter.normalizeCategory('albums')).toBe('music');
  });

  it('falls back to general for an empty or blank category', () => {
    // The partial-match loop asked `key.includes(lowerCategory)`, and every
    // key includes the empty string -- so a blank category matched the FIRST
    // entry of the alias table ('movies') and the item was enriched against
    // TMDB as a film. `/api/items/enrich` accepts a whitespace-only category
    // (its guard runs before the trim), so this was reachable from the wire.
    expect(SourceRouter.normalizeCategory('')).toBe('general');
    expect(SourceRouter.normalizeCategory('   ')).toBe('general');
    expect(SourceRouter.getAllSources('')).not.toContain('tmdb');
  });

  it('still falls back to general for an unknown category', () => {
    expect(SourceRouter.normalizeCategory('kitchen appliances')).toBe('general');
  });

  it('lets a known subcategory override a blank category', () => {
    expect(SourceRouter.normalizeCategory('', 'rpg')).toBe('games');
  });
});
