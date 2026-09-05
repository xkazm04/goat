/**
 * collection-color — the one door a collection's accent passes through before
 * it is painted.
 *
 * Two assertions: the function itself, and that every surface in the feature
 * actually uses it (a guard with an unguarded sibling is not a guard).
 * Comments are stripped before the source scan so a file that only mentions
 * the old pattern in prose neither passes nor fails on it.
 *
 * Negative control (recorded 2026-09-05, scan-sweep collections-manager):
 * against the pre-fix tree the source scan found 12 raw `collection.color ||`
 * interpolation sites across 6 files and 0 guarded ones.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEFAULT_COLLECTION_COLOR, safeCollectionColor } from './collection-color';

const ROOT = path.resolve(__dirname, '../../../../..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

describe('safeCollectionColor', () => {
  it('passes 6-digit hex through, normalised', () => {
    expect(safeCollectionColor('#06B6D4')).toBe('#06b6d4');
    expect(safeCollectionColor(' #ef4444 ')).toBe('#ef4444');
  });

  it('widens 3-digit hex so alpha-append sites keep working', () => {
    expect(safeCollectionColor('#abc')).toBe('#aabbcc');
  });

  it.each([
    'red',
    'red), url(https://evil.example/px',
    '#06b6d4; background-image: url(https://evil.example/px)',
    '#06b6d',
    '',
    null,
    undefined,
  ])('refuses %j and falls back', (input) => {
    expect(safeCollectionColor(input as string | null | undefined)).toBe(DEFAULT_COLLECTION_COLOR);
    expect(safeCollectionColor(input as string | null | undefined, '#123456')).toBe('#123456');
  });
});

const PAINTING_FILES = [
  'src/app/collections/[slug]/page.tsx',
  'src/app/features/Collections/components/CollectionCard.tsx',
  'src/app/features/Collections/components/CollectionManager.tsx',
  'src/app/features/Collections/components/CollectionSidebar.tsx',
  'src/app/features/Collections/components/CollectionView.tsx',
  'src/app/features/Collections/components/QuickCollectionSwitcher.tsx',
];

describe('every surface paints through the guard', () => {
  it.each(PAINTING_FILES)('%s has no raw collection.color fallback and imports the guard', (rel) => {
    const src = stripComments(read(rel));
    const raw = src.match(/collection\??\.color\s*\|\|/g) ?? [];
    expect(raw, `${rel} still interpolates collection.color with a bare fallback`).toHaveLength(0);
    expect(src).toMatch(/safeCollectionColor/);
  });
});
