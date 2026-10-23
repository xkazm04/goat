'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { memo, useCallback, useContext, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

import { Cover } from '@/v2/covers/Cover';
import { defaultX } from '@/v2/list/projections';

import { ModeContext, ReadOnlyContext, useEditor, useEditorStore } from './context';

/**
 * Drag ids: a card is `item:<id>`; a rank slot is `rank:<index>` (0-based,
 * "take this rank"); the pool is `pool`.
 */
const itemDragId = (id: string) => `item:${id}`;

/**
 * A cover you can pick up. Every mode renders items through this, and the
 * shared layoutId is what makes a cover travel when the mode or rank changes.
 */
function CardView({ id, title = true, label }: { id: string; title?: boolean; label: string }) {
  const readOnly = useContext(ReadOnlyContext);
  const mode = useContext(ModeContext);
  const store = useEditorStore();
  const item = useEditor((s) => s.items[id]);
  // A primitive: a reorder re-renders only the covers whose own rank changed, not all of them.
  const rank = useEditor((s) => s.history.present.order.indexOf(id));
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: itemDragId(id), disabled: readOnly });

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (readOnly) return;
      const { dispatch, history } = store.getState();
      const { order, canvasX } = history.present;
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && rank >= 0) {
        e.preventDefault();
        dispatch({ type: 'place', id, at: rank + (e.key === 'ArrowUp' ? -1 : 1) });
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && rank >= 0) {
        e.preventDefault();
        dispatch({ type: 'unrank', id });
      } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && mode === 'canvas' && rank >= 0) {
        e.preventDefault();
        const from = canvasX[id] ?? defaultX(rank + 1);
        dispatch({ type: 'setX', id, x: from + (e.key === 'ArrowLeft' ? -0.04 : 0.04) });
      } else if (e.key === 'Enter' && rank < 0) {
        e.preventDefault();
        dispatch({ type: 'place', id, at: order.length });
      }
    },
    [readOnly, store, id, rank, mode],
  );

  if (!item) return null;

  return (
    <motion.div
      ref={setNodeRef}
      layout="position"
      layoutId={`cover-${id}`}
      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      className="ed-card"
      data-dragging={isDragging}
      data-readonly={readOnly}
      {...attributes}
      {...listeners}
      aria-label={label}
      aria-roledescription={readOnly ? undefined : 'draggable cover'}
      onKeyDown={onKeyDown}
    >
      <Cover item={item} title={title} />
    </motion.div>
  );
}

/** Memoised: a list edit re-renders only the covers whose rank, item or label changed. */
export const Card = memo(CardView);

/** How many items play the staggered arrival (plates.css). */
export const REVEAL_FIRST = 10;

/** A rank you can drop onto: `index` is 0-based. */
export function RankSlot({
  index,
  className,
  children,
  ...rest
}: { index: number; className?: string; children: ReactNode } & Record<`data-${string}`, string | number | boolean>) {
  const { setNodeRef, isOver } = useDroppable({ id: `rank:${index}` });
  // `rv` plays the staggered arrival (plates.css) in reading order, only inside the editor's boot window.
  // Only the first few are staggered: they are what is in view. Animating all 25-50 costs about 150 ms of
  // main-thread time per mode switch on a mid-range device and nobody sees the tail.
  const reveal = index < REVEAL_FIRST;
  return (
    <div
      ref={setNodeRef}
      className={reveal ? `${className ?? ''} rv` : className}
      style={reveal ? ({ '--rv': index } as CSSProperties) : undefined}
      data-drop={isOver}
      {...rest}
    >
      {children}
    </div>
  );
}

/** An empty rank. Small slots show only the rank. */
export function EmptySlot({ rank, compact = false }: { rank: number; compact?: boolean }) {
  return (
    <div className="ed-empty" aria-label={`Empty rank ${rank}`}>
      {compact ? `#${rank}` : `Drop here for #${rank}`}
    </div>
  );
}
