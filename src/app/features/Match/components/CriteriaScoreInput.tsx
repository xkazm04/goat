'use client';

/**
 * CriteriaScoreInput
 * Component for inputting scores for individual criteria
 * Supports slider, stars, and numeric input modes
 * Features enhanced visual feedback with criterion color propagation
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Star, Minus, Plus, MessageSquare } from 'lucide-react';
import React, { useCallback, useState, useRef, useMemo } from 'react';

import { cn } from '@/lib/utils';

import type { Criterion, ScoreInputMode, CriterionScore } from '@/lib/criteria/types';

// Animation configuration
const ANIMATION_CONFIG = {
  spring: { stiffness: 300, damping: 30 },
  duration: { fast: 0.15, normal: 0.2, slow: 0.3 },
};

// Score quality thresholds for visual feedback
const SCORE_THRESHOLDS = {
  low: 33,
  mid: 66,
};

/**
 * Get score quality color based on percentage
 */
function getScoreQualityColor(percentage: number): string {
  if (percentage < SCORE_THRESHOLDS.low) return '#ef4444'; // red
  if (percentage < SCORE_THRESHOLDS.mid) return '#f59e0b'; // orange/amber
  return '#22c55e'; // green
}

/**
 * CriteriaScoreInput Props
 */
interface CriteriaScoreInputProps {
  criterion: Criterion;
  currentScore?: CriterionScore;
  inputMode: ScoreInputMode;
  onScoreChange: (score: number, note?: string) => void;
  className?: string;
  compact?: boolean;
  showNote?: boolean;
  /** Show live score preview with themed visualization */
  showPreview?: boolean;
  /** Category for themed preview */
  category?: string;
}

/**
 * CriteriaScoreInput Component
 */
export function CriteriaScoreInput({
  criterion,
  currentScore,
  inputMode,
  onScoreChange,
  className,
  compact = false,
  showNote = true,
  showPreview = false,
  category,
}: CriteriaScoreInputProps) {
  const [note, setNote] = useState(currentScore?.note ?? '');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const score = currentScore?.score ?? criterion.minScore;

  // Calculate percentage for visual feedback
  const range = criterion.maxScore - criterion.minScore;
  const percentage = ((score - criterion.minScore) / range) * 100;

  const handleScoreChange = useCallback(
    (newScore: number) => {
      onScoreChange(newScore, note || undefined);
    },
    [note, onScoreChange]
  );

  const handleNoteChange = useCallback(
    (newNote: string) => {
      setNote(newNote);
      onScoreChange(score, newNote || undefined);
    },
    [score, onScoreChange]
  );

  // Get dynamic score color based on criterion color and value
  const scoreColor = useMemo(() => {
    const baseColor = criterion.color ?? '#6366f1';
    // Use criterion color for filled portion, quality color for text
    return {
      fill: baseColor,
      quality: getScoreQualityColor(percentage),
    };
  }, [criterion.color, percentage]);

  return (
    <motion.div
      className={cn(
        'rounded-card border border-border bg-card/50 transition-all duration-200',
        isInteracting && 'border-border/80 shadow-md',
        !isInteracting && 'hover:border-border/80 hover:shadow-xs',
        compact ? 'p-3' : 'p-4',
        className
      )}
      animate={{
        borderColor: isInteracting ? `${criterion.color ?? '#6366f1'}40` : undefined,
      }}
      transition={{ duration: ANIMATION_CONFIG.duration.fast }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.span
            className="w-3 h-3 rounded-full shadow-xs"
            style={{ backgroundColor: criterion.color ?? '#6366f1' }}
            animate={{
              scale: isInteracting ? 1.15 : 1,
              boxShadow: isInteracting
                ? `0 0 8px ${criterion.color ?? '#6366f1'}60`
                : '0 1px 2px rgba(0,0,0,0.1)',
            }}
            transition={{ duration: ANIMATION_CONFIG.duration.fast }}
          />
          <span className={cn('font-medium', compact ? 'text-sm' : '')}>
            {criterion.name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({criterion.weight}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Animated score display */}
          <motion.span
            className={cn(
              'font-bold tabular-nums',
              compact ? 'text-sm' : 'text-lg'
            )}
            style={{ color: scoreColor.quality }}
            key={Math.floor(score * 10)}
            initial={{ scale: 1.1, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: ANIMATION_CONFIG.duration.fast }}
          >
            {score.toFixed(1)}
          </motion.span>
          <span className="text-xs text-muted-foreground">
            / {criterion.maxScore}
          </span>
        </div>
      </div>

      {/* Description */}
      {!compact && criterion.description && (
        <p className="text-xs text-muted-foreground mb-3">
          {criterion.description}
        </p>
      )}

      {/* Score Input */}
      {inputMode === 'slider' && (
        <SliderInput
          criterion={criterion}
          value={score}
          onChange={handleScoreChange}
          onInteractionStart={() => setIsInteracting(true)}
          onInteractionEnd={() => setIsInteracting(false)}
        />
      )}

      {inputMode === 'stars' && (
        <StarInput
          criterion={criterion}
          value={score}
          onChange={handleScoreChange}
          onInteractionStart={() => setIsInteracting(true)}
          onInteractionEnd={() => setIsInteracting(false)}
        />
      )}

      {inputMode === 'numeric' && (
        <NumericInput
          criterion={criterion}
          value={score}
          onChange={handleScoreChange}
          onInteractionStart={() => setIsInteracting(true)}
          onInteractionEnd={() => setIsInteracting(false)}
        />
      )}

      {/* Note toggle & input */}
      {showNote && (
        <div className="mt-2">
          {showNoteInput ? (
            <div className="space-y-1">
              <textarea
                value={note}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Add a note about your score..."
                className={cn(
                  'w-full px-2 py-1.5 text-xs rounded-control border border-border',
                  'bg-background resize-none transition-all duration-200',
                  'focus:outline-hidden focus:ring-2 focus:ring-ring/50 focus:border-ring'
                )}
                rows={2}
              />
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={() => setShowNoteInput(false)}
              >
                Hide note
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
              onClick={() => setShowNoteInput(true)}
            >
              <MessageSquare className="w-3 h-3" />
              {note ? 'Edit note' : 'Add note'}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Slider Input Component with enhanced feedback
 */
interface SliderInputProps {
  criterion: Criterion;
  value: number;
  onChange: (value: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

function SliderInput({
  criterion,
  value,
  onChange,
  onInteractionStart,
  onInteractionEnd,
}: SliderInputProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPercentage, setHoverPercentage] = useState<number | null>(null);

  const range = criterion.maxScore - criterion.minScore;
  const percentage = ((value - criterion.minScore) / range) * 100;
  const criterionColor = criterion.color ?? '#6366f1';

  const handleSliderClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const newValue = criterion.minScore + percent * range;
      onChange(Math.round(newValue * 10) / 10);
    },
    [criterion.minScore, range, onChange]
  );

  const handleDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.buttons !== 1) return;
      handleSliderClick(e);
    },
    [handleSliderClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!sliderRef.current || isDragging) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setHoverPercentage(percent);
    },
    [isDragging]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setHoverPercentage(null);
    }
  }, [isDragging]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
    onInteractionStart?.();
  }, [onInteractionStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    onInteractionEnd?.();
  }, [onInteractionEnd]);

  return (
    <div className="space-y-2">
      <div
        ref={sliderRef}
        className="relative h-3 rounded-full bg-muted cursor-pointer transition-all duration-200 hover:bg-muted/80 group"
        onClick={handleSliderClick}
        onMouseMove={(e) => {
          handleDrag(e);
          handleMouseMove(e);
        }}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Hover preview track */}
        <AnimatePresence>
          {hoverPercentage !== null && !isDragging && (
            <motion.div
              className="absolute h-full rounded-full pointer-events-none"
              style={{
                backgroundColor: `${criterionColor}20`,
                width: `${hoverPercentage}%`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            />
          )}
        </AnimatePresence>

        {/* Filled track */}
        <motion.div
          className="absolute h-full rounded-full"
          style={{
            backgroundColor: criterionColor,
            boxShadow: isDragging ? `0 0 12px ${criterionColor}60` : `0 0 4px ${criterionColor}30`,
          }}
          initial={false}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', ...ANIMATION_CONFIG.spring }}
        />

        {/* Tick marks for visual reference */}
        <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
          {[0, 25, 50, 75, 100].map((tick) => (
            <div
              key={tick}
              className="w-0.5 h-full bg-white/10 rounded-full"
              style={{ opacity: percentage > tick ? 0.3 : 0.1 }}
            />
          ))}
        </div>

        {/* Thumb */}
        <motion.div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 shadow-lg',
            'cursor-grab active:cursor-grabbing transition-shadow duration-150',
            isDragging && 'ring-4 ring-white/20'
          )}
          style={{
            borderColor: criterionColor,
            left: `${percentage}%`,
            marginLeft: '-10px',
            boxShadow: isDragging
              ? `0 0 0 4px ${criterionColor}20, 0 4px 12px rgba(0,0,0,0.2)`
              : '0 2px 6px rgba(0,0,0,0.15)',
          }}
          initial={false}
          animate={{
            left: `${percentage}%`,
            scale: isDragging ? 1.15 : 1,
          }}
          transition={{ type: 'spring', ...ANIMATION_CONFIG.spring }}
          whileHover={{ scale: 1.1 }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{criterion.minScore}</span>
        <span>{criterion.maxScore}</span>
      </div>
    </div>
  );
}

/**
 * Star Input Component with enhanced feedback
 */
function StarInput({
  criterion,
  value,
  onChange,
  onInteractionStart,
  onInteractionEnd,
}: SliderInputProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const range = criterion.maxScore - criterion.minScore;
  const starCount = Math.min(10, range);
  const starValue = ((value - criterion.minScore) / range) * starCount;

  const handleStarClick = useCallback(
    (starIndex: number) => {
      const newValue = criterion.minScore + ((starIndex + 1) / starCount) * range;
      onChange(Math.round(newValue * 10) / 10);
    },
    [criterion.minScore, range, starCount, onChange]
  );

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: starCount }).map((_, index) => {
        const filled = index < Math.floor(starValue);
        const partial = !filled && index < starValue;
        const hovered = hoverIndex !== null && index <= hoverIndex;

        return (
          <motion.button
            key={index}
            className="p-0.5 transition-transform duration-150 focus-ring-inset"
            onClick={() => handleStarClick(index)}
            onMouseEnter={() => {
              setHoverIndex(index);
              onInteractionStart?.();
            }}
            onMouseLeave={() => {
              setHoverIndex(null);
              onInteractionEnd?.();
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <Star
              className={cn(
                'w-5 h-5 transition-all duration-200',
                filled || hovered
                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                  : partial
                  ? 'fill-yellow-400/50 text-yellow-400'
                  : 'text-muted-foreground hover:text-yellow-400/60'
              )}
            />
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Numeric Input Component with enhanced feedback
 */
function NumericInput({
  criterion,
  value,
  onChange,
  onInteractionStart,
  onInteractionEnd,
}: SliderInputProps) {
  const step = (criterion.maxScore - criterion.minScore) / 10;

  const handleIncrement = useCallback(() => {
    const newValue = Math.min(criterion.maxScore, value + step);
    onChange(Math.round(newValue * 10) / 10);
  }, [criterion.maxScore, value, step, onChange]);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(criterion.minScore, value - step);
    onChange(Math.round(newValue * 10) / 10);
  }, [criterion.minScore, value, step, onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (isNaN(newValue)) return;
      const clamped = Math.max(
        criterion.minScore,
        Math.min(criterion.maxScore, newValue)
      );
      onChange(Math.round(clamped * 10) / 10);
    },
    [criterion.minScore, criterion.maxScore, onChange]
  );

  return (
    <div className="flex items-center justify-center gap-2">
      <motion.button
        className={cn(
          'p-1.5 rounded-card border border-border',
          'hover:bg-accent transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          'focus-ring-inset'
        )}
        onClick={handleDecrement}
        disabled={value <= criterion.minScore}
        onMouseDown={onInteractionStart}
        onMouseUp={onInteractionEnd}
        onMouseLeave={onInteractionEnd}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Minus className="w-4 h-4" />
      </motion.button>

      <motion.input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={criterion.minScore}
        max={criterion.maxScore}
        step={0.1}
        className={cn(
          'w-16 text-center text-lg font-bold tabular-nums',
          'bg-transparent border border-border rounded-card py-1 transition-all duration-200',
          'focus:outline-hidden focus:ring-2 focus:ring-ring/50 focus:border-ring'
        )}
        onFocus={onInteractionStart}
        onBlur={onInteractionEnd}
        whileFocus={{ scale: 1.02 }}
      />

      <motion.button
        className={cn(
          'p-1.5 rounded-card border border-border',
          'hover:bg-accent transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          'focus-ring-inset'
        )}
        onClick={handleIncrement}
        disabled={value >= criterion.maxScore}
        onMouseDown={onInteractionStart}
        onMouseUp={onInteractionEnd}
        onMouseLeave={onInteractionEnd}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

/**
 * Bulk Criteria Score Input - for scoring all criteria at once
 */
interface BulkCriteriaScoreInputProps {
  criteria: Criterion[];
  scores: Record<string, CriterionScore>;
  inputMode: ScoreInputMode;
  onScoreChange: (criterionId: string, score: number, note?: string) => void;
  className?: string;
  compact?: boolean;
  /** Category for themed preview */
  category?: string;
  /** Show weighted score preview */
  showWeightedPreview?: boolean;
  /** Current weighted score */
  weightedScore?: number;
}

export function BulkCriteriaScoreInput({
  criteria,
  scores,
  inputMode,
  onScoreChange,
  className,
  compact = false,
  category,
  showWeightedPreview = false,
  weightedScore = 0,
}: BulkCriteriaScoreInputProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {criteria.map((criterion) => (
        <CriteriaScoreInput
          key={criterion.id}
          criterion={criterion}
          currentScore={scores[criterion.id]}
          inputMode={inputMode}
          onScoreChange={(score, note) => onScoreChange(criterion.id, score, note)}
          compact={compact}
          showNote={!compact}
          category={category}
        />
      ))}
    </div>
  );
}

export default CriteriaScoreInput;
