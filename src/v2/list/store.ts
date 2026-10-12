import { createStore } from 'zustand/vanilla';

import { commit, redo, startHistory, undo, type History } from './history';

import type { Command, ItemId, ListDoc, ListItem } from './types';

/**
 * One editor's state: the list's history plus the items it can show. A store
 * per open list (not a global), so two lists never share undo.
 */
export interface EditorState {
  history: History;
  items: Record<ItemId, ListItem>;
  dispatch: (cmd: Command) => void;
  /** Make new items known and put them at the front of the pool, as one undo step. */
  addItems: (items: ListItem[]) => void;
  undo: () => void;
  redo: () => void;
}

export function createEditorStore(init: { history?: History; doc?: ListDoc; items: ListItem[] }) {
  const history = init.history ?? (init.doc ? startHistory(init.doc) : null);
  if (!history) throw new Error('createEditorStore needs a history or a doc');

  return createStore<EditorState>()((set) => ({
    history,
    items: Object.fromEntries(init.items.map((i) => [i.id, i])),
    dispatch: (cmd) => set((s) => ({ history: commit(s.history, cmd) })),
    addItems: (added) =>
      set((s) => ({
        items: { ...Object.fromEntries(added.map((i) => [i.id, i])), ...s.items },
        history: commit(s.history, { type: 'addToPool', ids: added.map((i) => i.id) }),
      })),
    undo: () => set((s) => ({ history: undo(s.history) })),
    redo: () => set((s) => ({ history: redo(s.history) })),
  }));
}

export type EditorStore = ReturnType<typeof createEditorStore>;
