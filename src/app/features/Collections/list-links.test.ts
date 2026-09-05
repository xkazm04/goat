/**
 * Collections → list navigation contract.
 *
 * A ranked list is opened at ONE address in this app: the `(match)/goat` page,
 * which reads `?list=<id>` (src/app/(match)/goat/page.tsx). Twelve surfaces
 * push `/goat?list=`; the Collections feature was the only one linking to
 * `/match/<id>`, a route that does not exist in `src/app`, so every list card
 * in a collection — dashboard grid, dashboard rows, public share page grid and
 * rows — was a 404.
 *
 * The test derives the canonical address from the goat page itself (the param
 * name it reads) rather than from a hand-written string, and then checks every
 * list link in this feature against it. Comments are stripped before matching
 * so a file that merely TALKS about `/match/` cannot satisfy or fail it.
 *
 * Negative control (recorded 2026-09-05, scan-sweep collections-manager):
 * against the pre-fix tree this file failed with 4 `/match/` links found and
 * 0 canonical links; green after the fix with 4 canonical links.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

const LIST_LINK_FILES = [
  'src/app/features/Collections/components/CollectionView.tsx',
  'src/app/collections/[slug]/page.tsx',
];

describe('collections link to lists at the address the match page actually serves', () => {
  const goatPage = stripComments(read('src/app/(match)/goat/page.tsx'));
  const paramMatch = goatPage.match(/searchParams\.get\(['"]([a-zA-Z_]+)['"]\)/);

  it('the goat page still reads its list id from a query param (ground truth for this test)', () => {
    expect(paramMatch?.[1]).toBe('list');
    expect(existsSync(path.join(ROOT, 'src/app/match'))).toBe(false);
  });

  it.each(LIST_LINK_FILES)('%s links every list to /goat?list= and never to /match/', (rel) => {
    const src = stripComments(read(rel));
    const param = paramMatch?.[1] ?? 'list';
    const canonical = src.match(new RegExp(`/goat\\?${param}=\\$\\{list\\.id\\}`, 'g')) ?? [];
    const phantom = src.match(/\/match\/\$\{/g) ?? [];
    expect(phantom, `${rel} links to the non-existent /match/ route`).toHaveLength(0);
    expect(canonical.length, `${rel} has no list links at all`).toBeGreaterThanOrEqual(2);
  });
});
