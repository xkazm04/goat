/**
 * Import v1's seeded starter content into goat_v2 (docs/v2/TECHNICAL_PACKAGE.md
 * §9, round 8 decision "import the seed lists").
 *
 *   npm run seed:v2              # dry run: read v1, print the plan, write nothing
 *   npm run seed:v2 -- --apply   # write it
 *
 * Reads the predefined lists and the awards event from v1's public schema,
 * then upserts goat_v2 items, lists and list_entries. Ids are kept, so a
 * re-run updates in place. The lists are published as public starters owned
 * by a seed curator account, which is created once (or set
 * V2_SEED_CURATOR_ID to reuse an existing auth user).
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY: v1 rows are
 * read and goat_v2 rows written past row level security. Exit codes:
 * 0 done, 1 failed, 2 could not run (missing settings).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { planImport, type V1Item, type V1List, type V1ListItem } from '../../src/v2/seeds/fromV1';

const APPLY = process.argv.includes('--apply');
const CURATOR_EMAIL = 'seed-curator@goat-v2.invalid';

function cannotRun(reason: string): never {
  console.error(`[seed:v2] could not run: ${reason}`);
  process.exit(2);
}

function clients(): { v1: SupabaseClient; v2: SupabaseClient } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) cannotRun('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (load .env)');
  const auth = { persistSession: false };
  return {
    v1: createClient(url, key, { auth }),
    v2: createClient(url, key, { auth, db: { schema: 'goat_v2' } }),
  };
}

async function readV1(db: SupabaseClient) {
  const lists = await db
    .from('lists')
    .select('id, title, category, subcategory, type, parent_list_id')
    .or('predefined.eq.true,type.eq.award');
  if (lists.error) throw new Error(`v1 lists: ${lists.error.message}`);
  const listRows = (lists.data ?? []) as V1List[];
  const listIds = listRows.map((l) => l.id);
  if (listIds.length === 0) return { lists: listRows, items: [] as V1Item[], listItems: [] as V1ListItem[] };

  const listItems = await db.from('list_items').select('list_id, item_id, ranking').in('list_id', listIds);
  if (listItems.error) throw new Error(`v1 list_items: ${listItems.error.message}`);
  const liRows = (listItems.data ?? []) as V1ListItem[];

  const itemIds = [...new Set(liRows.map((r) => r.item_id))];
  const items: V1Item[] = [];
  for (let i = 0; i < itemIds.length; i += 200) {
    const page = await db
      .from('items')
      .select('id, name, category, subcategory, item_year, image_url, tags')
      .in('id', itemIds.slice(i, i + 200));
    if (page.error) throw new Error(`v1 items: ${page.error.message}`);
    items.push(...((page.data ?? []) as V1Item[]));
  }
  return { lists: listRows, items, listItems: liRows };
}

async function curatorId(db: SupabaseClient): Promise<string> {
  if (process.env.V2_SEED_CURATOR_ID) return process.env.V2_SEED_CURATOR_ID;
  const existing = await db.auth.admin.listUsers({ perPage: 1000 });
  if (existing.error) throw new Error(`list users: ${existing.error.message}`);
  const found = existing.data.users.find((u) => u.email === CURATOR_EMAIL);
  if (found) return found.id;
  if (!APPLY) return '(curator created on --apply)';
  const created = await db.auth.admin.createUser({ email: CURATOR_EMAIL, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(`create curator: ${created.error?.message}`);
  return created.data.user.id;
}

async function upsert(db: SupabaseClient, table: string, rows: object[], onConflict?: string) {
  for (let i = 0; i < rows.length; i += 500) {
    const res = await db.from(table).upsert(rows.slice(i, i + 500), onConflict ? { onConflict } : undefined);
    if (res.error) throw new Error(`goat_v2.${table}: ${res.error.message}`);
  }
}

async function main() {
  const { v1, v2 } = clients();
  const source = await readV1(v1);
  const owner = await curatorId(v1);
  const plan = planImport(source, owner, new Date().toISOString());

  console.log(`[seed:v2] ${APPLY ? 'applying' : 'dry run'}: v1 has ${source.lists.length} seed lists`);
  console.log(`[seed:v2] plan: ${plan.lists.length} lists, ${plan.items.length} items, ${plan.entries.length} entries`);
  for (const l of plan.lists) {
    const n = plan.entries.filter((e) => e.list_id === l.id).length;
    console.log(`  ${l.kind === 'awards' ? 'awards ' : 'ranking'}  ${l.title}  (${n} ranked, ${l.topic})`);
  }
  for (const s of plan.skipped) console.log(`  skipped: ${s}`);

  if (!APPLY) {
    console.log('[seed:v2] nothing written. Re-run with --apply to import.');
    return;
  }
  await upsert(v2, 'items', plan.items);
  await upsert(v2, 'lists', plan.lists);
  await upsert(v2, 'list_entries', plan.entries, 'list_id,item_id');
  console.log('[seed:v2] done.');
}

main().catch((error: unknown) => {
  console.error(`[seed:v2] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
