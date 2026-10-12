'use client';

import { useDroppable } from '@dnd-kit/core';
import { useContext, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { canvasBands, projectCanvas, rankIndexAt, type CanvasBand } from '@/v2/list/projections';

import { Card } from './Card';
import { ReadOnlyContext, useEditor } from './context';

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

/**
 * Canvas: height is greatness. Drop a cover higher to rank it higher; where it
 * sits sideways is yours. The tier lines between bands can be dragged.
 * Drops are resolved in Editor's onDragEnd (the board is the `canvas` target).
 */
export function Canvas() {
  const doc = useEditor((s) => s.history.present);
  const items = useEditor((s) => s.items);
  const { bands, pins } = projectCanvas(doc);
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });
  const boardRef = useRef<HTMLDivElement | null>(null);

  // The field is inset from the board's edge so covers at the very top or
  // side are never clipped; all coordinates (and drops) are relative to it.
  return (
    <div className="cv" data-drop={isOver}>
      <span className="cv-legend" aria-hidden="true">
        Higher is greater · sideways is free
      </span>
      <div
        ref={(el) => {
          setNodeRef(el);
          boardRef.current = el;
        }}
        className="cv-field"
        aria-label="Canvas. Higher is greater; sideways is free."
      >
      {bands.map((band, i) => (
        <Band key={band.index} band={band} first={i === 0} />
      ))}
      {bands.slice(0, -1).map((band) => (
        <Cut key={`cut-${band.index}`} band={band} boardRef={boardRef} />
      ))}
      {pins.map((pin) =>
        items[pin.id] ? (
          <div key={pin.id} className="cv-pin" style={{ left: pct(pin.x), top: pct(pin.y) }}>
            <span className="cv-rank" data-top={pin.rank <= 3} aria-hidden="true">
              {pin.rank}
            </span>
            <Card id={pin.id} title={false} label={`#${pin.rank} ${items[pin.id].title}`} />
            {pin.rank <= 3 ? <span className="cv-name">{items[pin.id].title}</span> : null}
          </div>
        ) : null,
      )}
      </div>
    </div>
  );
}

/** A tier band with its name, which can be renamed by double-click or Enter. */
function Band({ band, first }: { band: CanvasBand; first: boolean }) {
  const dispatch = useEditor((s) => s.dispatch);
  const readOnly = useContext(ReadOnlyContext);
  const [editing, setEditing] = useState(false);

  return (
    <div className="cv-band" data-first={first} style={{ top: pct(band.top), height: pct(band.height) }}>
      {editing ? (
        <input
          id={`tier-name-${band.index}`}
          className="cv-tier-input"
          defaultValue={band.tier}
          aria-label={`Rename tier ${band.tier}`}
          ref={(el) => el?.focus()}
          onBlur={(e) => {
            dispatch({ type: 'renameTier', index: band.index, name: e.currentTarget.value });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="cv-tier"
          disabled={readOnly}
          title={readOnly ? undefined : 'Double-click or press Enter to rename'}
          onDoubleClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setEditing(true);
          }}
        >
          {band.tier}
          <span>
            {band.from}–{band.to}
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * The line between a band and the next. Drag it (or focus it and press
 * ↑/↓) to move where the tier ends. While dragging, the layout is frozen at
 * the start so the line tracks the pointer instead of the reflowing bands.
 */
function Cut({ band, boardRef }: { band: CanvasBand; boardRef: React.RefObject<HTMLDivElement | null> }) {
  const doc = useEditor((s) => s.history.present);
  const dispatch = useEditor((s) => s.dispatch);
  const readOnly = useContext(ReadOnlyContext);
  const [preview, setPreview] = useState<{ y: number; until: number } | null>(null);
  const frozen = useRef<CanvasBand[] | null>(null);

  const until = doc.tiers[band.index].until;
  const y = band.top + band.height;

  const untilAt = (clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || !frozen.current) return null;
    const fy = (clientY - rect.top) / rect.height;
    return { y: Math.min(Math.max(fy, 0), 1), until: rankIndexAt(frozen.current, fy) + 1 };
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (readOnly) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    frozen.current = canvasBands(doc);
    setPreview({ y, until });
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!frozen.current) return;
    const next = untilAt(e.clientY);
    if (next) setPreview(next);
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!frozen.current) return;
    const next = untilAt(e.clientY);
    frozen.current = null;
    setPreview(null);
    if (next) dispatch({ type: 'setTierCut', index: band.index, until: next.until });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (readOnly || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    dispatch({ type: 'setTierCut', index: band.index, until: until + (e.key === 'ArrowUp' ? -1 : 1) });
  };

  const shown = preview ?? { y, until };
  return (
    <div className="cv-cut" data-active={preview !== null} style={{ top: pct(shown.y) }}>
      <button
        type="button"
        className="cv-cut-handle"
        disabled={readOnly}
        aria-label={`Tier line after rank ${until}. Use up and down arrows to move it.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          frozen.current = null;
          setPreview(null);
        }}
        onKeyDown={onKeyDown}
      >
        #{shown.until} | #{shown.until + 1}
      </button>
    </div>
  );
}
