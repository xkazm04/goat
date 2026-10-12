'use client';

import { useDroppable } from '@dnd-kit/core';
import { memo, useContext, useEffect, useState, type CSSProperties } from 'react';

import { ModeArt } from '@/v2/brand/ModeArt';
import { Cover } from '@/v2/covers/Cover';
import { currentMatch, finalOrder, pick, startBracket, type Bracket } from '@/v2/list/tournament';
import { STAGE_PRESETS, type ItemId, type StagePreset } from '@/v2/list/types';

import { Card, EmptySlot, RankSlot } from './Card';
import { ReadOnlyContext, useEditor } from './context';

/** How many lit spots each preset has, and the left-to-right order they stand in. */
const PRESET: Record<StagePreset, { label: string; spots: number; layout: number[] }> = {
  podium: { label: 'Podium', spots: 3, layout: [1, 0, 2] },
  rushmore: { label: 'Rushmore', spots: 4, layout: [0, 1, 2, 3] },
  throne: { label: 'Throne', spots: 1, layout: [0] },
};

const WINGS = 6;

/** A lit spot. Dropping on an occupied spot starts a face-off (Editor resolves `spot:<index>`). */
function Spot({ index, preset }: { index: number; preset: StagePreset }) {
  const id = useEditor((s) => s.history.present.order[index]);
  const item = useEditor((s) => (id ? s.items[id] : undefined));
  const { setNodeRef, isOver } = useDroppable({ id: `spot:${index}` });
  return (
    <div ref={setNodeRef} className="st-spot rv" style={{ '--rv': index } as CSSProperties} data-rank={index + 1} data-preset={preset} data-drop={isOver}>
      <div className="st-beam" aria-hidden="true" />
      <div className="st-cover">
        {item ? (
          // Rushmore's carved ovals would clip a printed title, so the name goes on the plinth instead.
          <Card id={item.id} title={preset !== 'rushmore'} label={`#${index + 1} ${item.title}`} />
        ) : (
          <EmptySlot rank={index + 1} />
        )}
      </div>
      <div className="st-plinth" aria-hidden="true">
        {index + 1}
        {preset === 'rushmore' && item ? <small>{item.title}</small> : null}
      </div>
    </div>
  );
}

/** Stage: the list as an awards show. Podium, Rushmore or Throne, the rest in the wings. */
function StageView({ onTournament }: { onTournament: () => void }) {
  const doc = useEditor((s) => s.history.present);
  const items = useEditor((s) => s.items);
  const dispatch = useEditor((s) => s.dispatch);
  const readOnly = useContext(ReadOnlyContext);
  const preset = PRESET[doc.stagePreset];
  const wings = Array.from({ length: Math.max(0, Math.min(WINGS, doc.size - preset.spots)) }, (_, i) => preset.spots + i);
  const more = Math.max(0, doc.order.length - preset.spots - WINGS);

  return (
    <div className="st" data-preset={doc.stagePreset}>
      <ModeArt mode="stage" preset={doc.stagePreset} />
      <div className="st-tools">
        <div className="ed-seg" role="group" aria-label="Stage preset">
          {STAGE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={doc.stagePreset === p}
              disabled={readOnly}
              onClick={() => dispatch({ type: 'setPreset', preset: p })}
            >
              {PRESET[p].label}
            </button>
          ))}
        </div>
        <span className="st-hint">Drop a cover on a lit spot to start a face-off.</span>
        {!readOnly ? (
          <button type="button" className="v2-btn" onClick={onTournament} disabled={doc.order.length < 2}>
            Run tournament
          </button>
        ) : null}
      </div>

      <div className="st-floor">
        <div className="st-spots">
          {preset.layout.map((i) => (
            <Spot key={i} index={i} preset={doc.stagePreset} />
          ))}
        </div>
      </div>

      <div className="st-wings" aria-label="In the wings">
        <span className="v2-eyebrow">In the wings</span>
        <div className="st-wings-row">
          {wings.map((i) => {
            const id = doc.order[i];
            return (
              <RankSlot key={i} index={i} className="st-wing">
                {id && items[id] ? (
                  <Card id={id} title={false} label={`#${i + 1} ${items[id].title}`} />
                ) : (
                  <EmptySlot rank={i + 1} compact />
                )}
                <span className="st-wing-rank">{i + 1}</span>
              </RankSlot>
            );
          })}
          {more > 0 ? <span className="st-more">+{more} more</span> : null}
        </div>
      </div>
    </div>
  );
}

/** Memoised: see Mosaic. `onTournament` must be a stable callback. */
export const Stage = memo(StageView);

/** Two covers under twin spotlights. Click one, or press ← / →. Esc calls it off. */
export function FaceOff({
  a,
  b,
  heading,
  onPick,
  onCancel,
  children,
}: {
  a: ItemId;
  b: ItemId;
  heading: string;
  onPick: (winner: ItemId) => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  const items = useEditor((s) => s.items);
  const notes = useEditor((s) => s.history.present.notes);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPick(a);
      else if (e.key === 'ArrowRight') onPick(b);
      else if (e.key === 'Escape') onCancel();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [a, b, onPick, onCancel]);

  const side = (id: ItemId, key: string) => {
    const item = items[id];
    if (!item) return null;
    return (
      <button type="button" className="fo-side" onClick={() => onPick(id)} aria-label={`${item.title} wins`}>
        <div className="fo-cover">
          <Cover item={item} />
        </div>
        <b>{item.title}</b>
        <span>{notes[id] ?? [item.year, item.creator].filter(Boolean).join(' · ')}</span>
        <kbd>{key}</kbd>
      </button>
    );
  };

  return (
    <div className="fo" role="dialog" aria-modal="true" aria-label={heading}>
      <div className="fo-panel">
        <span className="v2-eyebrow">{heading}</span>
        <div className="fo-duel">
          {side(a, '←')}
          <span className="fo-vs" aria-hidden="true">
            VS
          </span>
          {side(b, '→')}
        </div>
        {children}
        <button type="button" className="ed-ghost" onClick={onCancel}>
          Call it off (Esc)
        </button>
      </div>
    </div>
  );
}

/** The tournament overlay: every match a face-off, a bracket filling in beside it. */
export function Tournament({ onDone, onCancel }: { onDone: (ids: ItemId[]) => void; onCancel: () => void }) {
  const order = useEditor((s) => s.history.present.order);
  const items = useEditor((s) => s.items);
  const [bracket, setBracket] = useState<Bracket | null>(() => startBracket(order));

  const cur = bracket ? currentMatch(bracket) : null;
  useEffect(() => {
    if (!bracket || cur) return;
    const result = finalOrder(bracket);
    if (result) onDone(result);
  }, [bracket, cur, onDone]);

  if (!bracket || !cur) return null;
  const roundName = (r: number) => {
    const left = bracket.seeds.length / 2 ** r;
    return left === 2 ? 'Final' : left === 4 ? 'Semifinal' : 'Quarterfinal';
  };

  return (
    <FaceOff
      a={cur.match.a}
      b={cur.match.b}
      heading={`${roundName(cur.round)} · match ${cur.index + 1} of ${bracket.rounds[cur.round].length}`}
      onPick={(winner) => setBracket(pick(bracket, winner))}
      onCancel={onCancel}
    >
      <ol className="fo-bracket" aria-label="Bracket">
        {bracket.rounds.map((round, r) => (
          <li key={r}>
            <span>{roundName(r)}</span>
            {round.map((m, i) => (
              <span key={i} className="fo-match" data-current={r === cur.round && i === cur.index}>
                {[m.a, m.b].map((id) => (
                  <i key={id} data-won={m.winner === id} data-lost={m.winner !== null && m.winner !== id}>
                    {items[id]?.title ?? id}
                  </i>
                ))}
              </span>
            ))}
          </li>
        ))}
      </ol>
    </FaceOff>
  );
}
