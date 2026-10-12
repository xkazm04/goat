'use client';

import { useDroppable } from '@dnd-kit/core';

import { Card } from './Card';
import { useEditor } from './context';

/** Unranked candidates. Dropping a ranked cover here sends it back. */
export function Pool() {
  const pool = useEditor((s) => s.history.present.pool);
  const items = useEditor((s) => s.items);
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' });

  return (
    <aside className="pool" aria-label="Pool of unranked items">
      <h2>
        Pool <b>{pool.length}</b>
      </h2>
      <p>Drag a cover into the ranking, or focus it and press Enter. Drop a ranked cover here to unrank it.</p>
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
