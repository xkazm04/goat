'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { useSession } from '@/v2/auth/useSession';
import { fallbackArt } from '@/v2/covers/art';
import { Cover } from '@/v2/covers/Cover';
import { getBrowserClient } from '@/v2/db/browser';
import { DEMO_ITEMS, demoDoc } from '@/v2/list/fixtures';
import type { ListItem } from '@/v2/list/types';

const rowSchema = z.object({ id: z.string(), title: z.string(), topic: z.string() });
type Row = z.infer<typeof rowSchema>;

/** A title-only cover for a list, until list hero art arrives in M3. */
function listCover(row: Row): ListItem {
  return { id: row.id, title: row.title, year: null, creator: null, imageUrl: null, art: fallbackArt(row.title), traits: [] };
}

function ListCard({ href, title, topic, covers }: { href: string; title: string; topic: string; covers: ListItem[] }) {
  return (
    <li>
      <Link href={href} className="hl-card v2-glass">
        <div className="hl-covers" aria-hidden="true">
          {covers.slice(0, 3).map((c) => (
            <Cover key={c.id} item={c} title={covers.length === 1} />
          ))}
        </div>
        <span className="v2-eyebrow">{topic}</span>
        <b>{title}</b>
      </Link>
    </li>
  );
}

/** The lists you can open: the demo, your own lists, and published starter lists. */
export function HomeLists() {
  const session = useSession();
  const userId = session.status === 'guest' || session.status === 'member' ? session.userId : null;
  const [mine, setMine] = useState<Row[]>([]);
  const [starters, setStarters] = useState<Row[]>([]);

  useEffect(() => {
    const client = getBrowserClient();
    if (!client) return;
    let cancelled = false;
    const parse = (data: unknown) => z.array(rowSchema).catch([]).parse(data);

    client
      .from('lists')
      .select('id, title, topic')
      .eq('visibility', 'public')
      .not('published_at', 'is', null)
      .is('parent_id', null)
      .order('published_at', { ascending: false })
      .limit(12)
      .then(({ data }: { data: unknown }) => {
        if (!cancelled) setStarters(parse(data));
      });

    if (userId) {
      client
        .from('lists')
        .select('id, title, topic')
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false })
        .limit(24)
        .then(({ data }: { data: unknown }) => {
          if (!cancelled) setMine(parse(data));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const demo = demoDoc();
  const demoCovers = demo.order.slice(0, 3).map((id) => DEMO_ITEMS.find((i) => i.id === id)!);

  return (
    <section aria-labelledby="hl-title" className="hl">
      <h2 id="hl-title" className="v2-eyebrow">
        Your lists
      </h2>
      <ul className="hl-grid">
        <ListCard href="/l/demo" title={demo.title} topic="Demo · saved on this device" covers={demoCovers} />
        {mine.map((r) => (
          <ListCard key={r.id} href={`/l/${r.id}`} title={r.title} topic={r.topic} covers={[listCover(r)]} />
        ))}
      </ul>
      {starters.length > 0 ? (
        <>
          <h2 className="v2-eyebrow">Starter lists</h2>
          <ul className="hl-grid">
            {starters.map((r) => (
              <ListCard key={r.id} href={`/l/${r.id}`} title={r.title} topic={r.topic} covers={[listCover(r)]} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
