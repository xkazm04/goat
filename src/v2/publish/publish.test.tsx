import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DEMO_ITEMS, demoDoc } from '@/v2/list/fixtures';

import { embedMode, EmbedList } from './EmbedList';
import { buildOEmbed, embedCode, slugFromUrl } from './oembed';
import { publishList, unpublishList } from './publish';
import { isSlug, randomSuffix, slugAttempt, slugify } from './slug';

import type { Client } from '@/v2/list/sync';

describe('slugs', () => {
  it('turns a title into a readable slug that satisfies the database check', () => {
    expect(slugify('The Greatest RPGs Ever Made')).toBe('the-greatest-rpgs-ever-made');
    expect(slugify('  Café Müller!! 90s?  ')).toBe('cafe-muller-90s');
    expect(slugify('!!')).toBe('list');
    expect(slugify('Go')).toBe('go-list');
    expect(isSlug(slugify('x'.repeat(200)))).toBe(true);
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(60);
  });

  it('adds a short random tail after the first attempt', () => {
    expect(slugAttempt('my-list', 0)).toBe('my-list');
    const next = slugAttempt('my-list', 1, () => 0);
    expect(next).toMatch(/^my-list-[a-z0-9]{5}$/);
    expect(isSlug(next)).toBe(true);
    expect(randomSuffix(() => 0.999, 3)).toHaveLength(3);
  });

  it('rejects addresses the database would', () => {
    expect(isSlug('ab')).toBe(false);
    expect(isSlug('Has-Caps')).toBe(false);
    expect(isSlug('has space')).toBe(false);
    expect(isSlug('fine-slug-2')).toBe(true);
  });
});

describe('oEmbed', () => {
  const origin = 'https://goat.test';

  it('reads a slug only from this site\'s /p/<slug> urls', () => {
    expect(slugFromUrl('https://goat.test/p/top-rpgs', origin)).toBe('top-rpgs');
    expect(slugFromUrl('/p/top-rpgs/', origin)).toBe('top-rpgs');
    expect(slugFromUrl('https://evil.test/p/top-rpgs', origin)).toBeNull();
    expect(slugFromUrl('https://goat.test/v2/l/demo', origin)).toBeNull();
    expect(slugFromUrl('https://goat.test/p/Bad_Slug', origin)).toBeNull();
    expect(slugFromUrl('not a url at all', origin)).toBe(null);
  });

  it('builds a rich response whose html is an escaped iframe and sizes are clamped', () => {
    const body = buildOEmbed({ origin, slug: 'top-rpgs', title: 'Top "RPGs" <3', maxWidth: '5000', maxHeight: '10' });
    expect(body).toMatchObject({ version: '1.0', type: 'rich', width: 1200, height: 200, provider_name: 'G.O.A.T.' });
    expect(body.html).toContain('src="https://goat.test/embed/top-rpgs"');
    expect(body.html).toContain('title="Top &quot;RPGs&quot; &lt;3"');
    expect(body.thumbnail_url).toBe('https://goat.test/p/top-rpgs/opengraph-image');
  });

  it('gives the owner an embed snippet per mode', () => {
    expect(embedCode(origin, 'top-rpgs', 'mosaic')).toContain('src="https://goat.test/embed/top-rpgs"');
    expect(embedCode(origin, 'top-rpgs', 'spread')).toContain('src="https://goat.test/embed/top-rpgs?mode=spread"');
  });
});

describe('embed view', () => {
  const doc = demoDoc();
  const items = Object.fromEntries(DEMO_ITEMS.map((i) => [i.id, i]));

  it('renders the ranking in both modes, capped, with a link back', () => {
    for (const mode of ['mosaic', 'spread'] as const) {
      const html = renderToStaticMarkup(<EmbedList doc={doc} items={items} mode={mode} href="https://goat.test/p/x" />);
      expect(html).toContain(`data-mode="${mode}"`);
      expect(html).toContain('Elden Ring');
      expect(html).toContain('href="https://goat.test/p/x"');
      expect((html.match(/<li/g) ?? []).length).toBe(10);
    }
  });

  it('falls back to the mosaic for an unknown mode', () => {
    expect(embedMode('spread')).toBe('spread');
    expect(embedMode('weird')).toBe('mosaic');
    expect(embedMode(undefined)).toBe('mosaic');
  });

  it('escapes list text instead of injecting markup', () => {
    const html = renderToStaticMarkup(
      <EmbedList doc={{ ...doc, title: '<script>alert(1)</script>' }} items={items} mode="mosaic" href="/p/x" />,
    );
    expect(html).not.toContain('<script>');
  });
});

/** A just-enough PostgREST fake that records calls and can fail the slug update. */
function fakeClient(opts: { existingSlug?: string | null; collisions?: number }) {
  const calls: { table: string; op: string; payload?: unknown }[] = [];
  let collisions = opts.collisions ?? 0;
  const client = {
    from(table: string) {
      return {
        upsert: async (payload: unknown) => {
          calls.push({ table, op: 'upsert', payload });
          return { error: null };
        },
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { slug: opts.existingSlug ?? null }, error: null }) }),
        }),
        update: (payload: { slug?: string }) => ({
          eq: async () => {
            calls.push({ table, op: 'update', payload });
            if (payload.slug && collisions > 0) {
              collisions -= 1;
              return { error: { code: '23505', message: 'duplicate key' } };
            }
            return { error: null };
          },
        }),
      };
    },
  };
  return { client: client as unknown as Client, calls };
}

describe('publishList', () => {
  const doc = demoDoc();

  it('pushes the list, then claims a readable slug', async () => {
    const { client, calls } = fakeClient({});
    const { slug } = await publishList(client, doc, 'owner', 'unlisted');
    expect(slug).toBe('the-greatest-rpgs-ever-made');
    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual(['lists:upsert', 'list_entries:upsert', 'lists:update']);
    expect(calls[2].payload).toMatchObject({ slug, visibility: 'unlisted' });
  });

  it('retries with a random tail when the slug is taken', async () => {
    const { client, calls } = fakeClient({ collisions: 2 });
    const { slug } = await publishList(client, doc, 'owner', 'public', () => 0.5);
    expect(slug).toMatch(/^the-greatest-rpgs-ever-made-[a-z0-9]{5}$/);
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(3);
  });

  it('keeps an existing slug so shared links survive republishing', async () => {
    const { client, calls } = fakeClient({ existingSlug: 'my-old-link' });
    const { slug } = await publishList(client, doc, 'owner', 'public');
    expect(slug).toBe('my-old-link');
    const update = calls.find((c) => c.op === 'update')!;
    expect(update.payload).toMatchObject({ visibility: 'public' });
    expect(update.payload).not.toHaveProperty('slug');
  });

  it('gives up with a clear error after repeated collisions', async () => {
    const { client } = fakeClient({ collisions: 99 });
    await expect(publishList(client, doc, 'owner', 'public')).rejects.toThrow(/free address/);
  });

  it('unpublishes by clearing visibility and the publish time, not the slug', async () => {
    const { client, calls } = fakeClient({});
    await unpublishList(client, 'list-1');
    expect(calls[0].payload).toEqual({ visibility: 'private', published_at: null });
  });
});
