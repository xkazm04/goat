'use client';

import { createContext, useContext } from 'react';
import { useStore } from 'zustand';

import type { EditorState, EditorStore } from '@/v2/list/store';

const EditorContext = createContext<EditorStore | null>(null);

export const EditorProvider = EditorContext.Provider;

/** Read from the open list's store. Must be inside an EditorProvider. */
export function useEditor<T>(selector: (state: EditorState) => T): T {
  const store = useContext(EditorContext);
  if (!store) throw new Error('useEditor must be used inside EditorProvider');
  return useStore(store, selector);
}

/** Whether the open list can be edited by this visitor. */
export const ReadOnlyContext = createContext(false);

export type Mode = 'mosaic' | 'canvas' | 'spread' | 'stage';

/** The mode on screen, for behaviour that only makes sense in one (Canvas's sideways nudge). */
export const ModeContext = createContext<Mode>('mosaic');
