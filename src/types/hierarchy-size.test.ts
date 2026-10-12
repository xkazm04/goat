import { describe, expect, it } from 'vitest';

import { legacyShowcaseToBlueprint, type LegacyShowcaseItem } from './blueprint';
import { parseHierarchySize, DEFAULT_LIST_INTENT } from './list-intent';
import { showcasePresetToIntent } from './list-intent-transformers';

/**
 * "Read a list size out of a hierarchy label" had two implementations inside
 * src/types and they disagreed on every label that is not exactly `Top <n>`:
 *
 *   showcasePresetToIntent   parseInt(h.replace('Top ', ''), 10)  -> NaN
 *   legacyShowcaseToBlueprint h.match(/\d+/) ?? 50                -> 50
 *
 * Only the pair is wrong; each site reads fine alone. This test pins the shared
 * `parseHierarchySize` AND drives both call sites with the same labels, so a
 * future divergence reddens rather than diverging silently.
 */

const LABELS: Array<[label: string, size: number]> = [
  ['Top 50', 50],
  ['Top 10', 10],
  ['Top 100', 100],
  ['50', 50],
  ['Top-50', 50],
  ['top 25', 25],
  ['Best 10 of all time', 10],
];

function showcaseItem(hierarchy: string): LegacyShowcaseItem {
  return {
    id: 1,
    category: 'Sports',
    title: 'x',
    author: 'a',
    comment: 'c',
    color: { primary: '#000', secondary: '#111', accent: '#222' },
    timePeriod: 'all-time',
    hierarchy,
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
  };
}

describe('parseHierarchySize — one implementation for both src/types call sites', () => {
  it.each(LABELS)('reads %s as %i', (label, expected) => {
    expect(parseHierarchySize(label)).toBe(expected);
  });

  it('falls back rather than returning NaN for a label with no digits', () => {
    expect(parseHierarchySize('Top')).toBe(DEFAULT_LIST_INTENT.size);
    expect(parseHierarchySize('')).toBe(DEFAULT_LIST_INTENT.size);
    expect(parseHierarchySize(undefined)).toBe(DEFAULT_LIST_INTENT.size);
    expect(parseHierarchySize('Top', 50)).toBe(50);
  });

  it('never returns a non-integer for any of the labels or for junk', () => {
    for (const label of [...LABELS.map(([l]) => l), 'Top', '', 'NaN', '???']) {
      expect(Number.isInteger(parseHierarchySize(label))).toBe(true);
    }
  });

  it.each(LABELS)(
    'showcasePresetToIntent and legacyShowcaseToBlueprint agree on %s',
    (label, expected) => {
      expect(showcasePresetToIntent({ hierarchy: label }).size).toBe(expected);
      expect(legacyShowcaseToBlueprint(showcaseItem(label)).size).toBe(expected);
    }
  );

  it('an unparseable label no longer reaches an intent as NaN', () => {
    const intent = showcasePresetToIntent({ hierarchy: 'Top' });
    expect(Number.isInteger(intent.size)).toBe(true);
    expect(intent.size).toBe(DEFAULT_LIST_INTENT.size);
  });
});
