/**
 * The browser suite's fixture namespace — the ONE place its ids live.
 *
 * `scripts/seed-e2e.ts` writes these rows; the Playwright specs address them;
 * `scripts/e2e-suite-contract.test.ts` refuses a spec that hard-codes any other
 * UUID. Before this module existed the seed and `e2e/backlog-items-loading.spec.ts`
 * each carried their own list id, and the spec's (`06ca05fd-…`) was a real row
 * from somebody's development database that no seed ever wrote — so the spec
 * could only pass against that one machine.
 *
 * This file has no side effects and no dependencies, so a spec may import it
 * without pulling the Supabase client into the Playwright process.
 */

export const E2E_NS = 'e2e00000';

/**
 * A well-formed v4-shaped UUID whose final group is `<2-char kind><10 digits>`.
 * The group MUST be exactly 12 hex characters — Postgres rejects anything else
 * outright, which is how the first version of this function was caught: it
 * padded to 6 and every insert failed with "invalid input syntax for type
 * uuid". A malformed id is a could-not-run, and it said so.
 */
export const e2eId = (kind: string, n: number) =>
  `${E2E_NS}-0000-4000-8000-${kind}${String(n).padStart(10, '0')}`;

export const E2E_FIXTURE_USER = e2eId('aa', 1);

/**
 * Two lists, because a suite that only ever sees one cannot tell "the first
 * list" from "the list I chose". Sizes differ for the same reason.
 *
 * `predefined: true` keeps them out of any "my lists" view that filters on
 * ownership, so they are visible to browse journeys without pretending to
 * belong to a signed-in user the suite does not have.
 */
export const E2E_LISTS = [
  {
    id: e2eId('bb', 1),
    title: 'E2E Fixture — Greatest Games',
    category: 'games',
    subcategory: 'E2E',
    size: 10,
    itemCount: 12,
  },
  {
    id: e2eId('bb', 2),
    title: 'E2E Fixture — Greatest Athletes',
    category: 'sports',
    subcategory: 'E2E',
    size: 5,
    itemCount: 6,
  },
] as const;

/** Deterministic, boring, and obviously synthetic. */
export function e2eItemsFor(listIndex: number, count: number) {
  const list = E2E_LISTS[listIndex];
  return Array.from({ length: count }, (_, i) => ({
    id: e2eId(`c${listIndex}`, i + 1),
    name: `E2E ${list.category === 'games' ? 'Game' : 'Athlete'} ${String(i + 1).padStart(2, '0')}`,
    category: list.category,
    subcategory: 'E2E',
    description: `Deterministic fixture item ${i + 1} for ${list.title}.`,
    item_year: 2000 + i,
  }));
}

/** Every UUID the seed writes, so a reader can ask "is this id one of ours?". */
export function e2eAllIds(): Set<string> {
  const ids = new Set<string>([E2E_FIXTURE_USER]);
  E2E_LISTS.forEach((list, index) => {
    ids.add(list.id);
    for (const row of e2eItemsFor(index, list.itemCount)) ids.add(row.id);
    for (let i = 1; i <= list.size; i++) ids.add(e2eId(`d${index}`, i));
  });
  return ids;
}
