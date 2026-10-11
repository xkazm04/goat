import { apply } from './reducer';

import type { Command, ListDoc } from './types';

/** Undo depth. A document is a few kilobytes, so snapshots are cheap. */
const LIMIT = 100;

export interface History {
  past: ListDoc[];
  present: ListDoc;
  future: ListDoc[];
}

export function startHistory(doc: ListDoc): History {
  return { past: [], present: doc, future: [] };
}

/** Apply a command. A command that changes nothing leaves history untouched. */
export function commit(h: History, cmd: Command): History {
  const next = apply(h.present, cmd);
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [] };
}

export function undo(h: History): History {
  if (h.past.length === 0) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  if (h.future.length === 0) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
