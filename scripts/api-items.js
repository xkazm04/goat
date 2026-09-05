/**
 * Read EVERY item from GET /api/top/items, page by page.
 *
 * The route clamps `limit` to 200 (src/app/api/top/items/route.ts) and answers
 * `{ items, total, limit, offset, has_more }`. Asking for `limit=5000` once —
 * what analyze-images.js and validate-images.js did until 2026-09-05 — yields
 * 200 rows and a report headed "Validation complete!" over a fifth of the
 * population (registry: codebase-scanning/the-tree-is-not-the-population).
 *
 * This walks `offset` until the route says `has_more: false` and returns the
 * whole population with the total the route reported, so a caller can print
 * both and a reader can see they agree.
 */

const PAGE_SIZE = 200; // the route's ceiling; asking for more is silently clamped

/**
 * @param {string} apiBase e.g. http://localhost:3000
 * @param {{ pageSize?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<{ items: Array<Record<string, unknown>>, total: number, pages: number }>}
 */
async function fetchAllItems(apiBase, options = {}) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const fetchImpl = options.fetchImpl ?? fetch;
  const items = [];
  let offset = 0;
  let total = 0;
  let pages = 0;

  for (;;) {
    const url = `${apiBase}/api/top/items?limit=${pageSize}&offset=${offset}`;
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`GET ${url} -> HTTP ${response.status}`);
    }
    const data = await response.json();
    const page = Array.isArray(data.items) ? data.items : [];
    items.push(...page);
    total = typeof data.total === 'number' ? data.total : items.length;
    pages += 1;

    const hasMore = data.has_more === true && page.length > 0;
    if (!hasMore) break;
    offset += page.length;
  }

  return { items, total, pages };
}

module.exports = { fetchAllItems, PAGE_SIZE };
