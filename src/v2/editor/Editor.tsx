'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { LayoutGroup, MotionConfig } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import { Cover } from '@/v2/covers/Cover';
import { canvasBands, rankIndexAt } from '@/v2/list/projections';
import { LIST_SIZES, type ItemId } from '@/v2/list/types';
import { SharePanel, type ShareState } from '@/v2/publish/SharePanel';

import { Canvas } from './Canvas';
import { ModeContext, ReadOnlyContext, useEditor, type Mode } from './context';
import { Critic } from './Critic';
import { Mosaic } from './Mosaic';
import { Pool } from './Pool';
import { Spread } from './Spread';
import { FaceOff, Stage, Tournament } from './Stage';

const MODES: { id: Mode; label: string; key: string }[] = [
  { id: 'mosaic', label: 'Mosaic', key: '1' },
  { id: 'canvas', label: 'Canvas', key: '2' },
  { id: 'spread', label: 'Spread', key: '3' },
  { id: 'stage', label: 'Stage', key: '4' },
];

type Duel = { challenger: ItemId; incumbent: ItemId; at: number };

/** Prefer the slot under the pointer; fall back to overlap for keyboard-free edge cases. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

/** Grow a textarea to its content (fallback where CSS field-sizing is unsupported). */
function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/**
 * The list editor: one document, four modes (Mosaic, Canvas, Spread, Stage).
 * Every mode renders covers through the same Card, so switching mode moves
 * the same objects (docs/v2/TECHNICAL_PACKAGE.md §2.1).
 */
export function Editor({
  readOnly = false,
  status,
  banner,
  share,
}: {
  readOnly?: boolean;
  /** Where the list is saved, shown in the toolbar. */
  status: { text: string; error?: boolean };
  /** Optional strip under the title, e.g. "Make it mine" on someone else's list. */
  banner?: ReactNode;
  /** Publishing for your own saved list; omitted when it cannot be published (demo, offline, someone else's). */
  share?: ShareState;
}) {
  const doc = useEditor((s) => s.history.present);
  const items = useEditor((s) => s.items);
  const canUndo = useEditor((s) => s.history.past.length > 0);
  const canRedo = useEditor((s) => s.history.future.length > 0);
  const dispatch = useEditor((s) => s.dispatch);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const [mode, setMode] = useState<Mode>('mosaic');
  const [active, setActive] = useState<string | null>(null);
  const [duel, setDuel] = useState<Duel | null>(null);
  const [criticOpen, setCriticOpen] = useState(false);
  const [tournament, setTournament] = useState(false);
  const overlayOpen = duel !== null || tournament;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || overlayOpen) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !readOnly) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y' && !readOnly) {
        e.preventDefault();
        redo();
      } else if (!mod && !e.altKey) {
        const m = MODES.find((x) => x.key === e.key);
        if (m) setMode(m.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, readOnly, overlayOpen]);

  const onDragStart = (e: DragStartEvent) => setActive(String(e.active.id).replace(/^item:/, ''));

  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const id = String(e.active.id).replace(/^item:/, '');
    const over = e.over ? String(e.over.id) : null;
    if (!over) return;
    if (over === 'pool') dispatch({ type: 'unrank', id });
    else if (over.startsWith('rank:')) dispatch({ type: 'place', id, at: Number(over.slice(5)) });
    else if (over.startsWith('spot:')) {
      // Stage: an occupied spot is won in a face-off, not taken.
      const at = Number(over.slice(5));
      const incumbent = doc.order[at];
      if (incumbent && incumbent !== id) setDuel({ challenger: id, incumbent, at });
      else dispatch({ type: 'place', id, at });
    } else if (over === 'canvas') {
      // Canvas: the drop point is the cover's centre; height picks the rank, x is kept.
      const r = e.active.rect.current.translated;
      if (!r || e.over!.rect.width === 0) return;
      const board = e.over!.rect;
      const x = (r.left + r.width / 2 - board.left) / board.width;
      const y = (r.top + r.height / 2 - board.top) / board.height;
      dispatch({ type: 'place', id, at: rankIndexAt(canvasBands(doc), y), x });
    }
  };

  const resolveDuel = (winner: ItemId) => {
    if (!duel) return;
    // Winner takes the spot; if the incumbent holds, the challenger lands right below.
    dispatch({ type: 'place', id: duel.challenger, at: winner === duel.challenger ? duel.at : duel.at + 1 });
    setDuel(null);
  };

  const ranked = doc.order.length;
  const activeItem = active ? items[active] : null;

  return (
    <ReadOnlyContext.Provider value={readOnly}>
      <ModeContext.Provider value={mode}>
        <MotionConfig reducedMotion="user">
          <DndContext
            sensors={sensors}
            collisionDetection={collision}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActive(null)}
          >
            <LayoutGroup>
              <div className="ed">
                <div className="ed-main">
                  <div className="ed-bar" role="toolbar" aria-label="List tools">
                    <Link href="/" className="ed-back">
                      G.O.A.T.
                    </Link>
                    <div className="ed-seg" role="group" aria-label="Mode">
                      {MODES.map((m) => (
                        <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                          {m.label}
                          <kbd>{m.key}</kbd>
                        </button>
                      ))}
                    </div>
                    {!readOnly ? (
                      <div className="ed-seg" role="group" aria-label="List size">
                        {LIST_SIZES.map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-pressed={doc.size === n}
                            onClick={() => dispatch({ type: 'resize', size: n })}
                          >
                            Top {n}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <span className="ed-spacer" />
                    <span className="ed-status" role="status" data-state={status.error ? 'error' : 'ok'}>
                      {status.text}
                    </span>
                    {!readOnly ? (
                      <>
                        {share ? <SharePanel share={share} /> : null}
                        <button type="button" className="ed-ghost" aria-pressed={criticOpen} onClick={() => setCriticOpen((o) => !o)}>
                          Challenge me
                        </button>
                        <button type="button" className="ed-ghost" onClick={undo} disabled={!canUndo}>
                          Undo
                        </button>
                        <button type="button" className="ed-ghost" onClick={redo} disabled={!canRedo}>
                          Redo
                        </button>
                      </>
                    ) : null}
                  </div>

                  <header className="ed-head">
                    <span className="v2-eyebrow">{doc.topic}</span>
                    {/* Keyed by the title so undo/redo resets the field. A textarea so long titles wrap. */}
                    <textarea
                      key={doc.title}
                      id="list-title"
                      className="ed-title"
                      rows={1}
                      ref={autosize}
                      onInput={(e) => autosize(e.currentTarget)}
                      defaultValue={doc.title}
                      readOnly={readOnly}
                      aria-label="List title"
                      onBlur={(e) => dispatch({ type: 'setTitle', title: e.currentTarget.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                    />
                    <div className="ed-meta">
                      <span>
                        <b>{ranked}</b> of {doc.size} ranked
                      </span>
                      {!readOnly ? <span>Alt+↑/↓ moves a focused cover · Delete unranks · Ctrl+Z undoes</span> : null}
                    </div>
                    {banner}
                  </header>

                  {mode === 'mosaic' ? <Mosaic /> : null}
                  {mode === 'canvas' ? <Canvas /> : null}
                  {mode === 'spread' ? <Spread /> : null}
                  {mode === 'stage' ? <Stage onTournament={() => setTournament(true)} /> : null}
                </div>
                {!readOnly ? <Pool /> : null}
                {!readOnly && criticOpen ? <Critic onClose={() => setCriticOpen(false)} /> : null}
              </div>
            </LayoutGroup>
            <DragOverlay dropAnimation={null}>
              {activeItem ? (
                <div className="ed-overlay">
                  <Cover item={activeItem} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          {duel ? (
            <FaceOff
              a={duel.challenger}
              b={duel.incumbent}
              heading={`Face-off for #${duel.at + 1}`}
              onPick={resolveDuel}
              onCancel={() => setDuel(null)}
            />
          ) : null}
          {tournament ? (
            <Tournament
              onDone={(ids) => {
                dispatch({ type: 'reorder', ids });
                setTournament(false);
              }}
              onCancel={() => setTournament(false)}
            />
          ) : null}
        </MotionConfig>
      </ModeContext.Provider>
    </ReadOnlyContext.Provider>
  );
}
