import type { Command, ItemId, ListDoc, ListSize } from './types';

const MAX_TITLE = 160;
const MAX_NOTE = 2000;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function without(ids: ItemId[], id: ItemId): ItemId[] {
  return ids.filter((x) => x !== id);
}

/** Overflow past `size` drops back to the front of the pool, best first. */
function fit(order: ItemId[], pool: ItemId[], size: ListSize): { order: ItemId[]; pool: ItemId[] } {
  if (order.length <= size) return { order, pool };
  return { order: order.slice(0, size), pool: [...order.slice(size), ...pool] };
}

/**
 * Apply one command. Pure. Returns the SAME object when the command changes
 * nothing, so history can skip no-ops by identity.
 */
export function apply(doc: ListDoc, cmd: Command): ListDoc {
  switch (cmd.type) {
    case 'place': {
      const inOrder = doc.order.includes(cmd.id);
      const inPool = doc.pool.includes(cmd.id);
      if (!inOrder && !inPool) return doc;

      const base = without(doc.order, cmd.id);
      const at = clamp(Math.trunc(cmd.at), 0, Math.min(base.length, doc.size - 1));
      if (inOrder && doc.order.indexOf(cmd.id) === at) return doc;

      const order = [...base.slice(0, at), cmd.id, ...base.slice(at)];
      const next = fit(order, without(doc.pool, cmd.id), doc.size);
      return { ...doc, ...next };
    }

    case 'unrank': {
      if (!doc.order.includes(cmd.id)) return doc;
      return { ...doc, order: without(doc.order, cmd.id), pool: [cmd.id, ...doc.pool] };
    }

    case 'setNote': {
      if (!doc.order.includes(cmd.id) && !doc.pool.includes(cmd.id)) return doc;
      const text = cmd.text.slice(0, MAX_NOTE);
      const current = doc.notes[cmd.id] ?? '';
      if (text === current) return doc;
      const notes = { ...doc.notes };
      if (text.trim() === '') delete notes[cmd.id];
      else notes[cmd.id] = text;
      return { ...doc, notes };
    }

    case 'setTitle': {
      const title = cmd.title.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE);
      if (!title || title === doc.title) return doc;
      return { ...doc, title };
    }

    case 'resize': {
      if (cmd.size === doc.size) return doc;
      return { ...doc, size: cmd.size, ...fit(doc.order, doc.pool, cmd.size) };
    }
  }
}

/** True when the document is internally consistent. Used by tests and on load. */
export function isConsistent(doc: ListDoc): boolean {
  const seen = new Set<ItemId>();
  for (const id of [...doc.order, ...doc.pool]) {
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return doc.order.length <= doc.size;
}
