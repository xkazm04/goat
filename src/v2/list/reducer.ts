import { DEFAULT_TIERS, STAGE_PRESETS, type Command, type ItemId, type ListDoc, type ListSize } from './types';

const MAX_TITLE = 160;
const MAX_NOTE = 2000;
const MAX_TIER_NAME = 24;

const clampX = (x: number) => Math.round(clamp(x, 0, 1) * 1000) / 1000;

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
      const x = cmd.x === undefined ? undefined : clampX(cmd.x);
      const xChanged = x !== undefined && doc.canvasX[cmd.id] !== x;
      if (inOrder && doc.order.indexOf(cmd.id) === at && !xChanged) return doc;

      const order = [...base.slice(0, at), cmd.id, ...base.slice(at)];
      const next = fit(order, without(doc.pool, cmd.id), doc.size);
      return { ...doc, ...next, canvasX: xChanged ? { ...doc.canvasX, [cmd.id]: x } : doc.canvasX };
    }

    case 'reorder': {
      const top = doc.order.slice(0, cmd.ids.length);
      const same = top.length === cmd.ids.length && [...top].sort().join('\u0000') === [...cmd.ids].sort().join('\u0000');
      if (!same || new Set(cmd.ids).size !== cmd.ids.length || top.every((id, i) => id === cmd.ids[i])) return doc;
      return { ...doc, order: [...cmd.ids, ...doc.order.slice(cmd.ids.length)] };
    }

    case 'setTierCut': {
      const { index } = cmd;
      if (index < 0 || index >= doc.tiers.length - 1) return doc;
      const min = (doc.tiers[index - 1]?.until ?? 0) + 1;
      const max = doc.tiers[index + 1].until - 1;
      const until = clamp(Math.trunc(cmd.until), min, max);
      if (min > max || until === doc.tiers[index].until) return doc;
      const tiers = doc.tiers.map((t, i) => (i === index ? { ...t, until } : t));
      return { ...doc, tiers };
    }

    case 'renameTier': {
      const name = cmd.name.replace(/\s+/g, ' ').trim().slice(0, MAX_TIER_NAME);
      if (!doc.tiers[cmd.index] || !name || name === doc.tiers[cmd.index].name) return doc;
      return { ...doc, tiers: doc.tiers.map((t, i) => (i === cmd.index ? { ...t, name } : t)) };
    }

    case 'setX': {
      if (!doc.order.includes(cmd.id) && !doc.pool.includes(cmd.id)) return doc;
      const x = clampX(cmd.x);
      if (doc.canvasX[cmd.id] === x) return doc;
      return { ...doc, canvasX: { ...doc.canvasX, [cmd.id]: x } };
    }

    case 'setPreset': {
      if (cmd.preset === doc.stagePreset) return doc;
      return { ...doc, stagePreset: cmd.preset };
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

    case 'addToPool': {
      const known = new Set([...doc.order, ...doc.pool]);
      const fresh = [...new Set(cmd.ids)].filter((id) => !known.has(id));
      if (fresh.length === 0) return doc;
      return { ...doc, pool: [...fresh, ...doc.pool] };
    }

    case 'resize': {
      if (cmd.size === doc.size) return doc;
      return { ...doc, size: cmd.size, ...fit(doc.order, doc.pool, cmd.size) };
    }
  }
}

/**
 * Fill fields added after a document was saved (M1 saves have no canvasX or
 * stagePreset), so older local saves keep loading.
 */
export function normalizeDoc(doc: ListDoc): ListDoc {
  const partial = doc as Partial<ListDoc> & ListDoc;
  return {
    ...doc,
    tiers: Array.isArray(partial.tiers) && partial.tiers.length > 0 ? partial.tiers : DEFAULT_TIERS.map((t) => ({ ...t })),
    notes: partial.notes ?? {},
    canvasX: partial.canvasX ?? {},
    stagePreset: (STAGE_PRESETS as readonly string[]).includes(partial.stagePreset) ? partial.stagePreset : 'podium',
  };
}

/** True when the document is internally consistent. Used by tests and on load. */
export function isConsistent(doc: ListDoc): boolean {
  const seen = new Set<ItemId>();
  for (const id of [...doc.order, ...doc.pool]) {
    if (seen.has(id)) return false;
    seen.add(id);
  }
  if (doc.order.length > doc.size) return false;
  // Tiers must end in strictly increasing ranks.
  return doc.tiers.every((t, i) => t.until > (doc.tiers[i - 1]?.until ?? 0));
}
