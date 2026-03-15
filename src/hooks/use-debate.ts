/**
 * useDebate Hook
 *
 * Provides debate functionality to components. Handles API calls
 * to generate debate challenges and manage debate threads.
 */

import { useCallback } from 'react';
import { useDebateStore } from '@/stores/debate-store';
import type { DebateChallengeRequest, DebateChallengeResponse } from '@/lib/debate/types';

interface UseDebateOptions {
  category: string;
  subcategory?: string;
  listSize: number;
}

export function useDebate(options: UseDebateOptions) {
  const {
    enabled,
    threads,
    activeThreadId,
    panelOpen,
    isLoading,
    setEnabled,
    setPanelOpen,
    startDebate,
    setActiveThread,
    addAIMessage,
    addUserMessage,
    resolveDebate,
    setThreadLoading,
  } = useDebateStore();

  const activeThread = activeThreadId ? threads[activeThreadId] : null;

  /**
   * Call the debate API
   */
  const fetchDebateChallenge = useCallback(async (
    request: DebateChallengeRequest
  ): Promise<DebateChallengeResponse> => {
    const response = await fetch('/api/debate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate debate');
    }

    return response.json();
  }, []);

  /**
   * Challenge an item placement - starts a debate
   */
  const challengePlacement = useCallback(async (
    itemId: string,
    itemName: string,
    tier: string,
    position: number,
    context?: {
      tiermates?: string[];
      rankedAbove?: string[];
      rankedBelow?: string[];
    }
  ) => {
    startDebate(itemId, itemName, tier, position);

    try {
      const request: DebateChallengeRequest = {
        itemName,
        category: options.category,
        subcategory: options.subcategory,
        userTier: tier,
        userPosition: position,
        listSize: options.listSize,
        tiermates: context?.tiermates,
        rankedAbove: context?.rankedAbove,
        rankedBelow: context?.rankedBelow,
      };

      const response = await fetchDebateChallenge(request);
      addAIMessage(itemId, response);
    } catch (error) {
      addAIMessage(itemId, {
        argument: 'I wanted to weigh in on this placement, but I\'m having trouble right now. Try again!',
        challengeStrength: 0,
        controversyScore: 0,
        isHotTake: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [options.category, options.subcategory, options.listSize, startDebate, addAIMessage, fetchDebateChallenge]);

  /**
   * Reply to the AI in a debate thread
   */
  const replyToDebate = useCallback(async (content: string) => {
    if (!activeThread) return;

    addUserMessage(activeThread.id, content);
    setThreadLoading(activeThread.id, true);

    try {
      const request: DebateChallengeRequest = {
        itemName: activeThread.itemName,
        category: options.category,
        subcategory: options.subcategory,
        userTier: activeThread.tier,
        userPosition: activeThread.position,
        listSize: options.listSize,
        history: activeThread.messages,
      };

      const response = await fetchDebateChallenge(request);
      addAIMessage(activeThread.id, response);
    } catch (error) {
      addAIMessage(activeThread.id, {
        argument: 'Fair point! Let me think about that... (I had trouble generating a response)',
        challengeStrength: 0,
        controversyScore: activeThread.controversyScore,
        isHotTake: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setThreadLoading(activeThread.id, false);
    }
  }, [activeThread, options.category, options.subcategory, options.listSize, addUserMessage, addAIMessage, setThreadLoading, fetchDebateChallenge]);

  /**
   * Get controversy info for an item
   */
  const getControversy = useCallback((itemId: string) => {
    const thread = threads[itemId];
    if (!thread) return null;
    return {
      score: thread.controversyScore,
      isHotTake: thread.isHotTake,
      challengeStrength: thread.challengeStrength,
      hasDebate: thread.messages.length > 0,
    };
  }, [threads]);

  return {
    // State
    enabled,
    panelOpen,
    isLoading,
    activeThread,
    threads,

    // Actions
    setEnabled,
    setPanelOpen,
    setActiveThread,
    challengePlacement,
    replyToDebate,
    resolveDebate,
    getControversy,
  };
}
