import { useEffect } from 'react';

import { BracketMatchup } from '../../lib/bracketGenerator';

interface UseMatchupKeyboardOptions {
  matchup: BracketMatchup;
  selectedWinnerId: string | null;
  isConfirming: boolean;
  isCompareOpen: boolean;
  canUndo: boolean;
  onSelectWinner: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  onSkip?: () => void;
  onUndo?: () => void;
  onOpenCompare: () => void;
}

/**
 * Keyboard navigation hook for the matchup screen.
 * Handles arrow keys, number keys, enter, escape, and shortcuts.
 */
export function useMatchupKeyboard({
  matchup,
  selectedWinnerId,
  isConfirming,
  isCompareOpen,
  canUndo,
  onSelectWinner,
  onConfirm,
  onClose,
  onSkip,
  onUndo,
  onOpenCompare,
}: UseMatchupKeyboardOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConfirming || isCompareOpen) return;

      if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onOpenCompare();
        return;
      }

      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && canUndo && onUndo) {
        e.preventDefault();
        onUndo();
        return;
      }

      switch (e.key) {
        case '1':
        case 'ArrowLeft':
          if (matchup.participant1) {
            onSelectWinner(matchup.participant1.id);
          }
          break;
        case '2':
        case 'ArrowRight':
          if (matchup.participant2) {
            onSelectWinner(matchup.participant2.id);
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (selectedWinnerId) {
            onConfirm();
          }
          break;
        case 'Escape':
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          if (onSkip) onSkip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    matchup,
    selectedWinnerId,
    isConfirming,
    isCompareOpen,
    canUndo,
    onSelectWinner,
    onConfirm,
    onClose,
    onSkip,
    onUndo,
    onOpenCompare,
  ]);
}
