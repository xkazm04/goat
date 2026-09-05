import { describe, expect, it } from 'vitest';

import { DataNormalizer } from './DataNormalizer';

import type { DataSource, EnrichmentCategory, RawSourceData } from './types';

function raw(source: DataSource, rawData: Record<string, unknown>): RawSourceData {
  return { source, rawData, fetchedAt: 0, confidence: 0.8 };
}

const CATEGORY_FOR_SOURCE: Record<DataSource, EnrichmentCategory> = {
  tmdb: 'movies',
  igdb: 'games',
  spotify: 'music',
  wikipedia: 'general',
  gemini: 'general',
};

describe('DataNormalizer field mappings', () => {
  /**
   * The population under test is DERIVED from the normalizer's own declared
   * mapping table (`getFieldMappings`), not from a hand-written list of fields
   * someone remembered to check. Before this test the table was decorative --
   * nothing in the tree read it -- and it had drifted from the code: IGDB's
   * `storyline -> description` row was declared, IGDBFetcher put `storyline`
   * in its payload, and `normalizeSource` never looked at it.
   */
  const sources: DataSource[] = ['tmdb', 'igdb', 'spotify', 'wikipedia', 'gemini'];

  for (const source of sources) {
    const mappings = DataNormalizer.getFieldMappings(source);

    for (const [sourceField, target] of Object.entries(mappings)) {
      if (target !== 'name' && target !== 'description') continue;

      it(`reads ${source}.${sourceField} into ${target}`, () => {
        const normalized = DataNormalizer.normalizeSource(
          raw(source, { [sourceField]: `value of ${sourceField}` }),
          CATEGORY_FOR_SOURCE[source]
        );

        expect(normalized[target]).toBe(`value of ${sourceField}`);
      });
    }
  }

  it('prefers a games summary over its storyline when both are present', () => {
    const normalized = DataNormalizer.normalizeSource(
      raw('igdb', { name: 'A Game', summary: 'the summary', storyline: 'the storyline' }),
      'games'
    );

    expect(normalized.description).toBe('the summary');
  });
});
