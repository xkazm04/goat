'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { useContext, type KeyboardEvent, type ReactNode } from 'react';

import { Cover } from '@/v2/covers/Cover';
import { defaultX } from '@/v2/list/projections';

import { ModeContext, ReadOnlyContext, useEditor } from './context';

/**
 * Drag ids: a card is `item:<id>`; a rank slot is `rank:<index>` (0-based,
 * "take this rank"); the pool is `pool`.
 */
const itemDragId = (id: string) => `item:${id}`;

/**
 * A cover you can pick up. Every mode renders items through this, and the
 * shared layoutId is what makes a cover travel when the mode or rank changes.
 */
export function Card({ id, title = true, label }: { id: string; title?: boolean; label: string }) {
  const readOnly = useContext(ReadOnlyContext);
  const mode = useContext(ModeContext);
  const canvasX = useEditor((s) => s.history.present.canvasX[id]);
  const item = useEditor((s) => s.items[id]);
  const order = useEditor((s) => s.history.present.order);
  const dispatch = useEditor((s) => s.dispatch);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: itemDragId(id), disabled: readOnly });

  if (!item) return null;
  const rank = order.indexOf(id);

  const onKeyDown = (e: KeyboardEvent) => {
    if (readOnly) return;
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && rank >= 0) {
      e.preventDefault();
      dispatch({ type: 'place', id, at: rank + (e.key === 'ArrowUp' ? -1 : 1) });
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && rank >= 0) {
      e.preventDefault();
      dispatch({ type: 'unrank', id });
    } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && mode === 'canvas' && rank >= 0) {
      e.preventDefault();
      const from = canvasX ?? defaultX(rank + 1);
      dispatch({ type: 'setX', id, x: from + (e.key === 'ArrowLeft' ? -0.04 : 0.04) });
    } else if (e.key === 'Enter' && rank < 0) {
      e.preventDefault();
      dispatch({ type: 'place', id, at: order.length });
    }
  };

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

/** A rank you can drop onto: `index` is 0-based. */
export function RankSlot({
  index,
  className,
  children,
  ...rest
}: { index: number; className?: string; children: ReactNode } & Record<`data-${string}`, string | number | boolean>) {
  const { setNodeRef, isOver } = useDroppable({ id: `rank:${index}` });
  return (
    <div ref={setNodeRef} className={className} data-drop={isOver} {...rest}>
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
