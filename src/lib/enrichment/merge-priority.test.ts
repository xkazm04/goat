import { describe, expect, it } from 'vitest';

import { DataNormalizer } from './DataNormalizer';

import type { RawSourceData } from './types';

function raw(
  source: RawSourceData['source'],
  confidence: number,
  rawData: Record<string, unknown>
): RawSourceData {
  return { source, confidence, rawData, fetchedAt: 0 };
}

describe('DataNormalizer.mergeSources conflict resolution', () => {
  it('lets a confident low-priority source beat a doubtful high-priority one', () => {
    // Source priority alone decided every field, so a TMDB match the fetcher
    // itself only rated 0.31 -- barely over its accept threshold -- supplied
    // the name, description and images ahead of a Wikipedia page matched at
    // 0.95. That is the shape a near-miss title match takes once it reaches
    // the record: the wrong film's poster on the right item.
    const merged = DataNormalizer.normalize(
      [
        raw('tmdb', 0.31, { title: 'A Different Film', overview: 'wrong synopsis' }),
        raw('wikipedia', 0.95, { title: 'The Right Subject', extract: 'right summary' }),
      ],
      'movies'
    );

    expect(merged.name).toBe('The Right Subject');
    expect(merged.description).toBe('right summary');
  });

  it('still prefers the specialist source when both matched well', () => {
    const merged = DataNormalizer.normalize(
      [
        raw('wikipedia', 0.95, { title: 'The Subject', extract: 'general summary' }),
        raw('tmdb', 0.9, { title: 'The Subject', overview: 'tmdb synopsis' }),
      ],
      'movies'
    );

    expect(merged.description).toBe('tmdb synopsis');
  });

  it('reports the best confidence of the sources it merged', () => {
    const merged = DataNormalizer.normalize(
      [
        raw('tmdb', 0.31, { title: 'A Film' }),
        raw('wikipedia', 0.95, { title: 'A Film' }),
      ],
      'movies'
    );

    expect(merged.confidence).toBe(0.95);
    expect(merged.sources).toHaveLength(2);
  });
});
