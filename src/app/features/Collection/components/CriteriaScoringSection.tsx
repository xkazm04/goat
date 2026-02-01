'use client';

/**
 * CriteriaScoringSection
 * Collapsible scoring UI section for ItemDetailPopup
 * Integrates with criteria-store for local state and debounced DB sync
 * Features live themed score preview with micro-interactions
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, ChevronDown, Check, Sparkles } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { cn } from '@/lib/utils';
import { useCriteriaStore, useSyncStatus, useCriteriaSync } from '@/stores/criteria-store';
import { BulkCriteriaScoreInput } from '@/app/features/Match/components/CriteriaScoreInput';
import { MiniThemedPreview } from '@/components/ui/ScorePreviewOverlay';
import type { CriterionScore } from '@/lib/criteria/types';

// Animation configuration
const ANIMATION_CONFIG = {
  spring: { stiffness: 300, damping: 30 },
  duration: { fast: 0.15, normal: 0.2, slow: 0.3 },
};

// Score quality thresholds
const THRESHOLDS = {
  poor: 33,
  average: 50,
  good: 66,
  excellent: 85,
};

interface CriteriaScoringSection {
  itemId: string;
  listId: string;
  accentColor?: string;
  /** Category for themed preview display */
  category?: string;
}

/**
 * CriteriaScoringSection Component
 * Renders a collapsible section for scoring an item on criteria
 * Features live themed preview and threshold crossing animations
 */
export function CriteriaScoringSection({
  itemId,
  listId,
  accentColor = '#22d3ee',
  category,
}: CriteriaScoringSection) {
  // Local UI state
  const [isOpen, setIsOpen] = useState(false);
  const [recentlySaved, setRecentlySaved] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [thresholdCrossed, setThresholdCrossed] = useState(false);

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

  // Track threshold crossing for visual feedback
  useEffect(() => {
    if (previousScore === null) {
      setPreviousScore(weightedScore);
      return;
    }

    // Check if we crossed a threshold
    const prevQuality = getScoreQuality(previousScore);
    const currentQuality = getScoreQuality(weightedScore);

    if (prevQuality !== currentQuality) {
      setThresholdCrossed(true);
      setTimeout(() => setThresholdCrossed(false), 600);
    }

    setPreviousScore(weightedScore);
  }, [weightedScore, previousScore]);

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

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <div
        className="rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
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
              'hover:bg-white/5 transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20'
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

              {/* Weighted score with themed preview */}
              {weightedScore > 0 && (
                <motion.div
                  className="relative"
                  initial={prefersReducedMotion ? false : { scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={ANIMATION_CONFIG.spring}
                >
                  {/* Threshold crossing pulse effect */}
                  <AnimatePresence>
                    {thresholdCrossed && !prefersReducedMotion && (
                      <motion.div
                        className="absolute inset-0 rounded-md"
                        style={{ backgroundColor: accentColor }}
                        initial={{ opacity: 0.6, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Mini themed preview */}
                  <MiniThemedPreview
                    score={weightedScore}
                    category={category}
                    animated={!prefersReducedMotion}
                  />
                </motion.div>
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
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 transition-colors duration-200 group-hover:text-gray-400" />
              </motion.div>
            </div>
          </button>
        </Collapsible.Trigger>

        {/* Content */}
        <Collapsible.Content>
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
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

            {/* Live score preview panel */}
            {weightedScore > 0 && (
              <LiveScorePreview
                score={weightedScore}
                category={category}
                accentColor={accentColor}
                animated={!prefersReducedMotion}
              />
            )}

            {/* Criteria score inputs */}
            <BulkCriteriaScoreInput
              criteria={activeProfile.criteria}
              scores={itemScoresRecord}
              inputMode={scoreInputMode}
              onScoreChange={handleScoreChange}
              compact={true}
              category={category}
              showWeightedPreview={true}
              weightedScore={weightedScore}
            />
          </motion.div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

/**
 * Get score quality category based on score value
 */
function getScoreQuality(score: number): string {
  if (score < THRESHOLDS.poor) return 'poor';
  if (score < THRESHOLDS.average) return 'belowAverage';
  if (score < THRESHOLDS.good) return 'average';
  if (score < THRESHOLDS.excellent) return 'good';
  return 'excellent';
}

/**
 * LiveScorePreview - Shows animated weighted score during scoring
 */
interface LiveScorePreviewProps {
  score: number;
  category?: string;
  accentColor: string;
  animated?: boolean;
}

function LiveScorePreview({
  score,
  category,
  accentColor,
  animated = true,
}: LiveScorePreviewProps) {
  const quality = getScoreQuality(score);

  const qualityConfigs: Record<string, { label: string; color: string; icon: boolean }> = {
    poor: { label: 'Poor', color: '#ef4444', icon: false },
    belowAverage: { label: 'Below Avg', color: '#f97316', icon: false },
    average: { label: 'Average', color: '#eab308', icon: false },
    good: { label: 'Good', color: '#22c55e', icon: false },
    excellent: { label: 'Excellent', color: '#10b981', icon: true },
  };

  const qualityConfig = qualityConfigs[quality] ?? qualityConfigs.average;

  return (
    <motion.div
      className="mb-3 p-2 rounded-lg flex items-center justify-between"
      style={{
        background: `linear-gradient(135deg, ${accentColor}10 0%, ${accentColor}05 100%)`,
        border: `1px solid ${accentColor}20`,
      }}
      initial={animated ? { opacity: 0, y: -10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION_CONFIG.duration.normal }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
          Weighted Score
        </span>
        {qualityConfig.icon && (
          <motion.div
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Sparkles className="w-3 h-3 text-yellow-400" />
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Quality label */}
        <motion.span
          key={quality}
          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: `${qualityConfig.color}20`,
            color: qualityConfig.color,
          }}
          initial={animated ? { scale: 0.8, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: ANIMATION_CONFIG.duration.fast }}
        >
          {qualityConfig.label}
        </motion.span>

        {/* Score value */}
        <motion.span
          className="text-sm font-bold tabular-nums"
          style={{ color: accentColor }}
          key={Math.floor(score)}
          initial={animated ? { scale: 1.2, opacity: 0.8 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', ...ANIMATION_CONFIG.spring }}
        >
          {score.toFixed(1)}
        </motion.span>
      </div>
    </motion.div>
  );
}

export default CriteriaScoringSection;
