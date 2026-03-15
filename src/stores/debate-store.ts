/**
 * AI Debate Store
 *
 * Manages debate threads, active debates, and debate mode state.
 * Each item placement can have its own debate thread with the AI.
 */

import { create } from 'zustand';
import type {
  DebateState,
  DebateActions,
  DebateThread,
  DebateMessage,
  DebateChallengeResponse,
} from '@/lib/debate/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const initialState: DebateState = {
  threads: {},
  activeThreadId: null,
  enabled: false,
  panelOpen: false,
  isLoading: false,
};

export const useDebateStore = create<DebateState & DebateActions>()((set, get) => ({
  ...initialState,

  setEnabled: (enabled) => set({ enabled }),

  setPanelOpen: (panelOpen) => set({ panelOpen }),

  startDebate: (itemId, itemName, tier, position) => {
    const existingThread = get().threads[itemId];

    if (existingThread) {
      // Reactivate existing thread
      set({
        activeThreadId: itemId,
        panelOpen: true,
        threads: {
          ...get().threads,
          [itemId]: {
            ...existingThread,
            tier,
            position,
            status: 'loading',
            updatedAt: Date.now(),
          },
        },
      });
      return;
    }

    const thread: DebateThread = {
      id: itemId,
      itemId,
      itemName,
      tier,
      position,
      messages: [],
      challengeStrength: 0,
      controversyScore: 0,
      isHotTake: false,
      status: 'loading',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set({
      threads: { ...get().threads, [itemId]: thread },
      activeThreadId: itemId,
      panelOpen: true,
    });
  },

  setActiveThread: (threadId) => set({
    activeThreadId: threadId,
    panelOpen: threadId !== null,
  }),

  addAIMessage: (threadId, response) => {
    const thread = get().threads[threadId];
    if (!thread) return;

    const message: DebateMessage = {
      id: generateId(),
      role: 'ai',
      content: response.argument,
      timestamp: Date.now(),
      confidence: 1 - (response.challengeStrength / 100),
      isChallenge: response.challengeStrength > 30,
    };

    set({
      threads: {
        ...get().threads,
        [threadId]: {
          ...thread,
          messages: [...thread.messages, message],
          challengeStrength: response.challengeStrength,
          controversyScore: response.controversyScore,
          isHotTake: response.isHotTake,
          status: 'active',
          updatedAt: Date.now(),
        },
      },
    });
  },

  addUserMessage: (threadId, content) => {
    const thread = get().threads[threadId];
    if (!thread) return;

    const message: DebateMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    set({
      threads: {
        ...get().threads,
        [threadId]: {
          ...thread,
          messages: [...thread.messages, message],
          status: 'loading',
          updatedAt: Date.now(),
        },
      },
    });
  },

  resolveDebate: (threadId, resolution) => {
    const thread = get().threads[threadId];
    if (!thread) return;

    set({
      threads: {
        ...get().threads,
        [threadId]: {
          ...thread,
          status: 'resolved',
          resolution,
          updatedAt: Date.now(),
        },
      },
      panelOpen: false,
      activeThreadId: null,
    });
  },

  setThreadLoading: (threadId, loading) => {
    const thread = get().threads[threadId];
    if (!thread) return;

    set({
      threads: {
        ...get().threads,
        [threadId]: {
          ...thread,
          status: loading ? 'loading' : 'active',
          updatedAt: Date.now(),
        },
      },
      isLoading: loading,
    });
  },

  clearAll: () => set(initialState),
}));
