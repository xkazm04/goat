'use client';

/**
 * CriteriaScoringSection
 * Collapsible scoring UI section for ItemDetailPopup
 * Integrates with criteria-store for local state and debounced DB sync
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, ChevronDown, ChevronUp, Check } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { cn } from '@/lib/utils';
import { useCriteriaStore, useSyncStatus, useCriteriaSync } from '@/stores/criteria-store';
import { BulkCriteriaScoreInput } from '@/app/features/Match/components/CriteriaScoreInput';
import type { CriterionScore } from '@/lib/criteria/types';

interface CriteriaScoringSection {
  itemId: string;
  listId: string;
  accentColor?: string;
}

/**
 * CriteriaScoringSection Component
 * Renders a collapsible section for scoring an item on criteria
 */
export function CriteriaScoringSection({
  itemId,
  listId,
  accentColor = '#22d3ee',
}: CriteriaScoringSection) {
  // Local UI state
  const [isOpen, setIsOpen] = useState(false);
  const [recentlySaved, setRecentlySaved] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // Debounce timer ref
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Criteria store state
  const {
    activeProfileId,
    getActiveProfile,
    setItemScore,
    getItemScores,
    scoreInputMode,
  } = useCriteriaStore();

  // Sync hooks
  const { status: syncStatus } = useSyncStatus();
  const { syncItemScoresToDatabase } = useCriteriaSync();

  // Get active profile
  const activeProfile = getActiveProfile();

  // Get item scores and transform to Record<string, CriterionScore>
  const itemScoresRecord = useMemo(() => {
    const scores = getItemScores(itemId);
    if (!scores) return {};
    return scores.scores.reduce((acc, s) => {
      acc[s.criterionId] = s;
      return acc;
    }, {} as Record<string, CriterionScore>);
  }, [itemId, getItemScores]);

  // Get weighted score for display
  const weightedScore = useMemo(() => {
    const scores = getItemScores(itemId);
    return scores?.weightedScore ?? 0;
  }, [itemId, getItemScores]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  // Debounced sync function
  const debouncedSync = useCallback(
    (targetListId: string, targetItemId: string) => {
      // Clear existing timeouts
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }

      // Show pending indicator immediately
      setPendingSave(true);
      setRecentlySaved(false);

      // Set new timeout for 500ms debounce
      syncTimeoutRef.current = setTimeout(async () => {
        setPendingSave(false);
        await syncItemScoresToDatabase(targetListId, targetItemId);
        setRecentlySaved(true);
        savedTimeoutRef.current = setTimeout(() => setRecentlySaved(false), 1500);
      }, 500);
    },
    [syncItemScoresToDatabase]
  );

  // Handle score change
  const handleScoreChange = useCallback(
    (criterionId: string, score: number, note?: string) => {
      setItemScore(itemId, criterionId, score, note);
      debouncedSync(listId, itemId);
    },
    [itemId, listId, setItemScore, debouncedSync]
  );

  // Early return if no active profile
  if (!activeProfile || activeProfile.criteria.length === 0) {
    return null;
  }

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header / Trigger */}
        <Collapsible.Trigger asChild>
          <button
            className={cn(
              'w-full flex items-center justify-between px-3 py-2',
              'hover:bg-white/5 transition-colors',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20'
            )}
          >
            <div className="flex items-center gap-2">
              <BarChart3
                className="w-3.5 h-3.5"
                style={{ color: accentColor }}
              />
              <span className="text-xs font-medium text-gray-300">
                Score Item
              </span>

              {/* Weighted score badge (if > 0) */}
              {weightedScore > 0 && (
                <span
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded"
                  style={{
                    background: `${accentColor}20`,
                    color: accentColor,
                    border: `1px solid ${accentColor}30`,
                  }}
                >
                  {weightedScore.toFixed(1)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sync status indicator */}
              <AnimatePresence mode="wait">
                {pendingSave || syncStatus === 'syncing' ? (
                  <motion.div
                    key="saving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] text-gray-400 flex items-center gap-1"
                  >
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      Saving...
                    </motion.span>
                  </motion.div>
                ) : recentlySaved ? (
                  <motion.div
                    key="saved"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-green-400 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span className="text-[10px]">Saved</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Chevron toggle */}
              {isOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              )}
            </div>
          </button>
        </Collapsible.Trigger>

        {/* Content */}
        <Collapsible.Content>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-3"
          >
            {/* Profile name indicator */}
            <div className="text-[10px] text-gray-500 mb-2 flex items-center gap-1">
              <span>Using:</span>
              <span className="text-gray-400">{activeProfile.name}</span>
            </div>

            {/* Criteria score inputs */}
            <BulkCriteriaScoreInput
              criteria={activeProfile.criteria}
              scores={itemScoresRecord}
              inputMode={scoreInputMode}
              onScoreChange={handleScoreChange}
              compact={true}
            />
          </motion.div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

export default CriteriaScoringSection;
