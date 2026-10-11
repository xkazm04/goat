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
import { LIST_SIZES } from '@/v2/list/types';

import { ReadOnlyContext, useEditor } from './context';
import { Mosaic } from './Mosaic';
import { Pool } from './Pool';
import { Spread } from './Spread';

type Mode = 'spread' | 'mosaic';

const MODES: { id: Mode; label: string; key: string }[] = [
  { id: 'mosaic', label: 'Mosaic', key: '1' },
  { id: 'spread', label: 'Spread', key: '2' },
];

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
 * The list editor: one document, shown as Mosaic or Spread. Canvas and Stage
 * arrive in M2 (docs/v2/TECHNICAL_PACKAGE.md §10).
 */
export function Editor({
  readOnly = false,
  status,
  banner,
}: {
  readOnly?: boolean;
  /** Where the list is saved, shown in the toolbar. */
  status: { text: string; error?: boolean };
  /** Optional strip under the title, e.g. "Make it mine" on someone else's list. */
  banner?: ReactNode;
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
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
  }, [undo, redo, readOnly]);

  const onDragStart = (e: DragStartEvent) => setActive(String(e.active.id).replace(/^item:/, ''));

  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const id = String(e.active.id).replace(/^item:/, '');
    const over = e.over ? String(e.over.id) : null;
    if (!over) return;
    if (over === 'pool') dispatch({ type: 'unrank', id });
    else if (over.startsWith('rank:')) dispatch({ type: 'place', id, at: Number(over.slice(5)) });
  };

  const ranked = doc.order.length;
  const activeItem = active ? items[active] : null;

  return (
    <ReadOnlyContext.Provider value={readOnly}>
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
                  <Link href="/v2" className="ed-back">
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

                {mode === 'spread' ? <Spread /> : <Mosaic />}
              </div>
              {!readOnly ? <Pool /> : null}
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
      </MotionConfig>
    </ReadOnlyContext.Provider>
  );
}
