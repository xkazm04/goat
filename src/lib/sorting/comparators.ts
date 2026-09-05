/**
 * Comparators — the one place this app decides how values are ordered.
 *
 * Two rules, applied everywhere, because the alternative is per-call-site
 * accident (registry table/sorting):
 *
 *   1. ABSENT VALUES HAVE ONE DECLARED HOME: last, in BOTH directions.
 *      Not "coerced to 0", not "coerced to the epoch". Coercion is the defect
 *      this module exists to remove — `a.ranking ?? 0` made an unranked item
 *      indistinguishable from the worst-ranked one, and then floated all of
 *      them to the top of an ascending sort where they read as the best.
 *
 *      Note this is why direction is applied INSIDE each comparator rather
 *      than by negating the result at the call site. `-comparison` flips the
 *      absent rows too, so absent-last silently becomes absent-first for one
 *      of the two directions — which is exactly how the previous code behaved.
 *
 *   2. EVERY ORDER IS TOTAL. A comparator that can return 0 for two distinct
 *      rows is an incomplete order, and rows with equal keys then land in
 *      whatever sequence the engine happened to produce — different across
 *      refreshes, tiers and runs. `withIdTiebreak` appends the row identity as
 *      the final term. Identity, not a timestamp (collides) and not the
 *      display label (mutable, collides).
 *
 * Pure and dependency-free so it can be tested without a DOM, a store or a
 * fetch. See ./comparators.test.ts.
 */

export type SortDirection = 'asc' | 'desc';

/**
 * A value counts as absent when it is null, undefined, or a number that is not
 * a number. NaN is included deliberately: it compares false against everything,
 * so a NaN left in the value channel makes the whole sort non-deterministic
 * rather than merely wrong.
 */
function isAbsent(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value));
}

/**
 * Resolve the absent/present cases shared by every comparator.
 * Returns a comparison result, or null when both values are present and the
 * caller should compare them for real.
 */
function compareAbsence(a: unknown, b: unknown): number | null {
  const aAbsent = isAbsent(a);
  const bAbsent = isAbsent(b);
  if (aAbsent && bAbsent) return 0;
  if (aAbsent) return 1; // a goes after b — regardless of direction
  if (bAbsent) return -1;
  return null;
}

/** Numeric comparison. Absent last in both directions. */
export function compareNumeric(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: SortDirection,
): number {
  const absence = compareAbsence(a, b);
  if (absence !== null) return absence;
  return direction === 'asc' ? (a as number) - (b as number) : (b as number) - (a as number);
}

// One collator for the whole app: case-insensitive, accent-aware, locale
// collation. Byte-order comparison misfiles accented and non-Latin titles, and
// this app's lists are full of them.
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/**
 * Text comparison with locale collation. Absent last in both directions; an
 * empty string is a present value, not an absent one, and sorts as itself.
 */
export function compareText(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: SortDirection,
): number {
  const absence = compareAbsence(a, b);
  if (absence !== null) return absence;
  const result = collator.compare(a as string, b as string);
  return direction === 'asc' ? result : -result;
}

/**
 * Compare as instants, never as display strings. Unparseable input is treated
 * as ABSENT (last), not as the epoch — a missing date is not 1 January 1970,
 * and pretending it is puts every record without a date at one extreme of the
 * range where it reads as real data.
 */
export function compareInstant(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined,
  direction: SortDirection,
): number {
  const at = toInstant(a);
  const bt = toInstant(b);
  return compareNumeric(at, bt, direction);
}

function toInstant(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Make an order total by appending the row identity as the final term.
 *
 * The tiebreak is ALWAYS ascending by id, independent of the sort direction:
 * its job is determinism, not meaning, and flipping it with the direction
 * would make a descending sort reshuffle equal-keyed rows relative to the
 * ascending one for no reason a user could name.
 */
export function withIdTiebreak<T>(
  compare: (a: T, b: T) => number,
  getId: (item: T) => string,
): (a: T, b: T) => number {
  return (a, b) => {
    const primary = compare(a, b);
    if (primary !== 0) return primary;
    const ida = getId(a);
    const idb = getId(b);
    return ida < idb ? -1 : ida > idb ? 1 : 0;
  };
}

/**
 * Sort a COPY. `Array.prototype.sort` mutates, and sorting a derived array in
 * place inside a `useMemo` mutates that memo's own input — the classic way a
 * "pure" derivation reorders the thing it derived from.
 */
export function sortedBy<T>(items: readonly T[], compare: (a: T, b: T) => number): T[] {
  return [...items].sort(compare);
}
