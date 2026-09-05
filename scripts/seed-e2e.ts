/**
 * Deterministic fixtures for the browser suite.
 *
 * Registry: test-harness/platform-quirk-absorption, isolation-lanes;
 * demo-data-plane.
 *
 * WHY THIS EXISTS
 * ---------------
 * `e2e/global-setup.ts` refuses the run when the lists API answers with zero
 * lists, which is correct and was half the job: before it existed, an empty
 * database produced a suite that ran to completion, executed essentially
 * nothing, and reported GREEN. But refusing honestly is not the same as being
 * runnable, and the launcher deliberately does not seed — a setup that silently
 * populates a database it found empty hides the very condition it reports.
 *
 * This is the other half: an explicit, idempotent, deterministic seed a human
 * or a pipeline RUNS ON PURPOSE.
 *
 * WHAT IT WRITES, AND WHAT IT WILL NOT TOUCH
 * ------------------------------------------
 * Every row it writes has a FIXED UUID from the `e2e00000-…` namespace below,
 * and every write is an upsert on that id. It never deletes, updates or reads
 * anything outside that namespace. Run it against a database with real data and
 * the real data is untouched; run it twice and the second run is a no-op.
 * `--teardown` removes exactly the same namespace and nothing else.
 *
 * That containment is what makes it safe to point at a shared development
 * database, which is the only kind this project has.
 *
 * SAFETY RAIL
 * -----------
 * Writing to a database is a side effect with a blast radius, so the script
 * refuses a non-local target unless told explicitly:
 *
 *   E2E_SEED_ALLOW_REMOTE=1 npm run seed:e2e
 *
 * A localhost / 127.0.0.1 Supabase URL needs no flag. The point is not that
 * remote is forbidden; it is that nobody seeds a remote database by accident,
 * and the flag is the record that they meant to.
 *
 * EXIT CODES
 *   0  seeded (or, with --check, the fixtures are present and complete)
 *   1  a verdict: fixtures missing/incomplete under --check, or a write refused
 *   2  COULD NOT RUN — no credentials, unreachable, or the schema is not what
 *      this script expects. Not a pass and not a failure.
 *
 * USAGE
 *   npm run seed:e2e              write the fixtures
 *   npm run seed:e2e -- --check   verify without writing (safe anywhere)
 *   npm run seed:e2e -- --teardown  remove exactly this namespace
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const TEARDOWN = argv.includes('--teardown');

const EXIT_OK = 0;
const EXIT_VERDICT = 1;
const EXIT_CANNOT_RUN = 2;

function cannotRun(what: string, detail?: string): never {
  console.error(`\n[seed-e2e] COULD NOT RUN — ${what}`);
  if (detail) console.error(`[seed-e2e] ${detail}`);
  console.error('[seed-e2e] This is not a pass and not a failure. Nothing was measured.');
  process.exit(EXIT_CANNOT_RUN);
}

// ---------------------------------------------------------------------------
// The namespace. Every id here is fixed, so a re-run is an upsert and a
// teardown is exact. The prefix is greppable on purpose: `e2e0` in a database
// row is always this script's doing.
// ---------------------------------------------------------------------------

const NS = 'e2e00000';
/**
 * A well-formed v4-shaped UUID whose final group is `<2-char kind><10 digits>`.
 * The group MUST be exactly 12 hex characters — Postgres rejects anything else
 * outright, which is how the first version of this function was caught: it
 * padded to 6 and every insert failed with "invalid input syntax for type
 * uuid". A malformed id is a could-not-run, and it said so.
 */
const id = (kind: string, n: number) =>
  `${NS}-0000-4000-8000-${kind}${String(n).padStart(10, '0')}`;

const FIXTURE_USER = id('aa', 1);

/**
 * Two lists, because a suite that only ever sees one cannot tell "the first
 * list" from "the list I chose". Sizes differ for the same reason.
 *
 * `predefined: true` keeps them out of any "my lists" view that filters on
 * ownership, so they are visible to browse journeys without pretending to
 * belong to a signed-in user the suite does not have.
 */
const LISTS = [
  {
    id: id('bb', 1),
    title: 'E2E Fixture — Greatest Games',
    category: 'games',
    subcategory: 'E2E',
    size: 10,
    itemCount: 12,
  },
  {
    id: id('bb', 2),
    title: 'E2E Fixture — Greatest Athletes',
    category: 'sports',
    subcategory: 'E2E',
    size: 5,
    itemCount: 6,
  },
] as const;

/** Deterministic, boring, and obviously synthetic. */
function itemsFor(listIndex: number, count: number) {
  const list = LISTS[listIndex];
  return Array.from({ length: count }, (_, i) => ({
    id: id(`c${listIndex}`, i + 1),
    name: `E2E ${list.category === 'games' ? 'Game' : 'Athlete'} ${String(i + 1).padStart(2, '0')}`,
    category: list.category,
    subcategory: 'E2E',
    description: `Deterministic fixture item ${i + 1} for ${list.title}.`,
    item_year: 2000 + i,
  }));
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cannotRun(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set',
      'Load them from .env (`node --env-file=.env`) or export them. The service role key is ' +
        'required because the fixtures are written server-side, past row-level security.',
    );
  }
  const isLocal = /localhost|127\.0\.0\.1|\[::1\]/.test(url);
  if (!isLocal && !CHECK && process.env.E2E_SEED_ALLOW_REMOTE !== '1') {
    console.error(`\n[seed-e2e] REFUSING to write to a non-local database.`);
    console.error(`[seed-e2e] target: ${url.replace(/\/\/([^.]+)/, '//***')}`);
    console.error(
      `[seed-e2e] Every row this writes is namespaced (${NS}-…) and nothing outside that`,
    );
    console.error(`[seed-e2e] namespace is read, updated or deleted — but writing to a shared`);
    console.error(`[seed-e2e] database should be deliberate. Re-run with:`);
    console.error(`[seed-e2e]     E2E_SEED_ALLOW_REMOTE=1 npm run seed:e2e`);
    process.exit(EXIT_VERDICT);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function assertSchema(db: SupabaseClient) {
  // A schema this script does not recognise is a could-not-run, not a failure:
  // seeding the wrong shape would leave a database that is worse than empty.
  for (const table of ['users', 'lists', 'items', 'list_items']) {
    const { error } = await db.from(table).select('id').limit(1);
    if (error) {
      cannotRun(`table "${table}" is not readable`, error.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Seed / check / teardown
// ---------------------------------------------------------------------------

async function seed(db: SupabaseClient) {
  const userRow = {
    id: FIXTURE_USER,
    username: 'e2e-fixture',
    display_name: 'E2E Fixture User',
    external_id: `${NS}-fixture`,
    password: 'not-a-real-credential',
  };
  const { error: userErr } = await db.from('users').upsert(userRow, { onConflict: 'id' });
  if (userErr) cannotRun('could not upsert the fixture user', userErr.message);

  let items = 0;
  let rankings = 0;

  for (const [index, list] of LISTS.entries()) {
    const { error: listErr } = await db.from('lists').upsert(
      {
        id: list.id,
        title: list.title,
        category: list.category,
        subcategory: list.subcategory,
        size: list.size,
        predefined: true,
        user_id: FIXTURE_USER,
        description: 'Deterministic fixture list for the Playwright suite.',
      },
      { onConflict: 'id' },
    );
    if (listErr) cannotRun(`could not upsert list ${list.title}`, listErr.message);

    const rows = itemsFor(index, list.itemCount);
    const { error: itemErr } = await db.from('items').upsert(rows, { onConflict: 'id' });
    if (itemErr) cannotRun('could not upsert fixture items', itemErr.message);
    items += rows.length;

    // Rank only the first `size` items, so each list has BOTH ranked entries
    // and unranked candidates — a suite whose fixture list is already complete
    // cannot exercise placing anything.
    const ranked = rows.slice(0, list.size).map((row, i) => ({
      id: id(`d${index}`, i + 1),
      list_id: list.id,
      item_id: row.id,
      ranking: i + 1,
    }));

    // DELETE-THEN-INSERT, not upsert, and the reason is measured rather than
    // stylistic. `list_items` carries a BEFORE INSERT OR UPDATE trigger
    // (`trigger_rerank_list_items`) that renumbers siblings. A batch upsert
    // makes that trigger touch rows the same command has already written, and
    // Postgres refuses:
    //
    //   tuple to be updated was already modified by an operation triggered by
    //   the current command
    //
    // The first run succeeded and the SECOND one failed, which is exactly the
    // shape of defect an idempotence check exists to find — and did, on the
    // first re-run against a real database.
    //
    // Both statements are confined to this namespace's fixed ids.
    const { error: delErr } = await db
      .from('list_items')
      .delete()
      .in(
        'id',
        ranked.map((r) => r.id),
      );
    if (delErr) cannotRun('could not clear previous fixture rankings', delErr.message);

    const { error: liErr } = await db.from('list_items').insert(ranked);
    if (liErr) cannotRun('could not insert list_items', liErr.message);
    rankings += ranked.length;
  }

  console.log(
    `[seed-e2e] seeded: 1 user, ${LISTS.length} lists, ${items} items, ${rankings} rankings — ` +
      `all in the ${NS}-… namespace.`,
  );
}

/** What `--check` verifies, and what it prints so a green run says what it saw. */
async function check(db: SupabaseClient): Promise<boolean> {
  let ok = true;
  const { data: lists, error } = await db.from('lists').select('id, title, size').in(
    'id',
    LISTS.map((l) => l.id),
  );
  if (error) cannotRun('could not read the fixture lists', error.message);

  const found = new Set((lists ?? []).map((l) => l.id));
  for (const l of LISTS) {
    if (!found.has(l.id)) {
      console.error(`[seed-e2e] MISSING list "${l.title}" (${l.id})`);
      ok = false;
    }
  }

  for (const [index, list] of LISTS.entries()) {
    const { count: itemCount } = await db
      .from('items')
      .select('id', { count: 'exact', head: true })
      .in(
        'id',
        itemsFor(index, list.itemCount).map((r) => r.id),
      );
    const { count: rankCount } = await db
      .from('list_items')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', list.id);

    console.log(
      `[seed-e2e] ${list.title}: ${itemCount ?? 0}/${list.itemCount} items, ` +
        `${rankCount ?? 0}/${list.size} ranked.`,
    );
    if ((itemCount ?? 0) < list.itemCount || (rankCount ?? 0) < list.size) ok = false;
  }
  return ok;
}

/**
 * Remove exactly the namespace, children first — `list_items.item_id` is ON
 * DELETE RESTRICT, so items cannot go before the rankings that reference them.
 */
async function teardown(db: SupabaseClient) {
  let removed = 0;
  for (const [index, list] of LISTS.entries()) {
    const rankIds = Array.from({ length: list.size }, (_, i) => id(`d${index}`, i + 1));
    const { error: e1 } = await db.from('list_items').delete().in('id', rankIds);
    if (e1) cannotRun('could not remove fixture list_items', e1.message);

    const itemIds = itemsFor(index, list.itemCount).map((r) => r.id);
    const { error: e2 } = await db.from('items').delete().in('id', itemIds);
    if (e2) cannotRun('could not remove fixture items', e2.message);
    removed += itemIds.length;
  }
  const { error: e3 } = await db
    .from('lists')
    .delete()
    .in(
      'id',
      LISTS.map((l) => l.id),
    );
  if (e3) cannotRun('could not remove fixture lists', e3.message);
  const { error: e4 } = await db.from('users').delete().eq('id', FIXTURE_USER);
  if (e4) cannotRun('could not remove the fixture user', e4.message);

  console.log(
    `[seed-e2e] teardown: removed ${LISTS.length} lists, ${removed} items and 1 user. ` +
      `Nothing outside the ${NS}-… namespace was touched.`,
  );
}

// ---------------------------------------------------------------------------

async function main() {
  const db = client();
  await assertSchema(db);

  if (TEARDOWN) {
    await teardown(db);
    process.exit(EXIT_OK);
  }

  if (CHECK) {
    const ok = await check(db);
    if (!ok) {
      console.error('');
      console.error('[seed-e2e] fixtures are missing or incomplete. Run: npm run seed:e2e');
      process.exit(EXIT_VERDICT);
    }
    console.log('[seed-e2e] fixtures present and complete.');
    process.exit(EXIT_OK);
  }

  await seed(db);
  const ok = await check(db);
  if (!ok) {
    console.error('[seed-e2e] wrote the fixtures but the verification pass disagrees.');
    process.exit(EXIT_VERDICT);
  }
  process.exit(EXIT_OK);
}

main().catch((err) => {
  cannotRun('unhandled failure', String(err?.message ?? err));
});
