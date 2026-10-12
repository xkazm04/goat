'use client';

import { useDroppable } from '@dnd-kit/core';
import { useRef, useState } from 'react';

import { findGaps } from '@/v2/ai/client';
import { snapshotOf } from '@/v2/ai/snapshot';

import { Card } from './Card';
import { useEditor } from './context';

/** Unranked candidates. Dropping a ranked cover here sends it back. */
export function Pool() {
  const doc = useEditor((s) => s.history.present);
  const pool = doc.pool;
  const items = useEditor((s) => s.items);
  const addItems = useEditor((s) => s.addItems);
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' });

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function spotGaps() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setNotice(null);
    try {
      const found = await findGaps(snapshotOf(doc, items), controller.signal);
      addItems(found.map((f) => f.item));
      setNotice(found.length === 0 ? 'No gaps found. The list covers the field.' : `Added ${found.length} to the front of the pool.`);
    } catch (cause) {
      if (!controller.signal.aborted) setNotice(cause instanceof Error ? cause.message : 'Could not look for gaps.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="pool" aria-label="Pool of unranked items">
      <h2>
        Pool <b>{pool.length}</b>
      </h2>
      <p>Drag a cover into the ranking, or focus it and press Enter. Drop a ranked cover here to unrank it.</p>
      <button type="button" className="v2-btn" onClick={() => void spotGaps()} disabled={busy}>
        {busy ? 'Looking…' : 'Find gaps'}
      </button>
      {notice ? <p role="status">{notice}</p> : null}
      <div ref={setNodeRef} className="pool-grid" data-drop={isOver}>
        {pool.map((id) =>
          items[id] ? (
            <div key={id}>
              <Card id={id} title={false} label={`${items[id].title}, unranked`} />
              <span className="pool-name">{items[id].title}</span>
            </div>
          ) : null,
        )}
      </div>
    </aside>
  );
}
