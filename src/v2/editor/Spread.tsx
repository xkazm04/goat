'use client';

import { memo, useContext } from 'react';

import { SpreadPlate } from '@/v2/brand/SpreadPlate';
import { projectSpread } from '@/v2/list/projections';

import { Card, EmptySlot, RankSlot } from './Card';
import { ReadOnlyContext, useEditor } from './context';

/** Spread: the editorial column. You edit the page readers will see. */
function SpreadView() {
  const doc = useEditor((s) => s.history.present);
  const items = useEditor((s) => s.items);
  const dispatch = useEditor((s) => s.dispatch);
  const readOnly = useContext(ReadOnlyContext);
  const rows = projectSpread(doc);

  return (
    <div className="sp-wrap">
      <div className="sp">
      {rows.map((row) => {
        const item = row.id ? items[row.id] : null;
        return (
          <div key={row.rank}>
            {row.tierStart ? (
              <h2 className="sp-tier">
                {row.tier}
                <span>
                  {row.rank}–{doc.tiers.find((t) => t.name === row.tier)?.until ?? doc.size}
                </span>
              </h2>
            ) : null}
            <RankSlot index={row.rank - 1} className="sp-row" data-rank={row.rank} data-compact={row.compact}>
              <span className="sp-num" aria-hidden="true">
                {row.rank}
              </span>
              {item ? (
                <>
                  <Card id={item.id} title={false} label={`#${row.rank} ${item.title}`} />
                  <div className="sp-body">
                    <h3 className="sp-name">{item.title}</h3>
                    <span className="sp-by">
                      {[item.year, item.creator].filter((v) => v !== null && v !== '').join(' · ')}
                    </span>
                    {!row.compact ? (
                      <textarea
                        key={`${item.id}:${doc.notes[item.id] ?? ''}`}
                        id={`note-${item.id}`}
                        className="sp-note"
                        rows={1}
                        defaultValue={doc.notes[item.id] ?? ''}
                        placeholder={readOnly ? '' : 'Why here?'}
                        readOnly={readOnly}
                        aria-label={`Note for ${item.title}`}
                        onBlur={(e) => dispatch({ type: 'setNote', id: item.id, text: e.currentTarget.value })}
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <EmptySlot rank={row.rank} compact={row.compact} />
                  <span />
                </>
              )}
            </RankSlot>
          </div>
        );
      })}
      </div>
      <SpreadPlate />
    </div>
  );
}

/** Memoised: see Mosaic. */
export const Spread = memo(SpreadView);
