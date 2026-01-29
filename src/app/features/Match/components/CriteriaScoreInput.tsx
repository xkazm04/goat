'use client';

/**
 * CriteriaScoreInput
 * Component for inputting scores for individual criteria
 * Supports slider, stars, and numeric input modes
 */

import React, { useCallback, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Star, Minus, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Criterion, ScoreInputMode, CriterionScore } from '@/lib/criteria/types';

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
}: CriteriaScoreInputProps) {
  const [note, setNote] = useState(currentScore?.note ?? '');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const score = currentScore?.score ?? criterion.minScore;

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

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card/50',
        compact ? 'p-3' : 'p-4',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: criterion.color ?? '#6366f1' }}
          />
          <span className={cn('font-medium', compact ? 'text-sm' : '')}>
            {criterion.name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({criterion.weight}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-bold',
              compact ? 'text-sm' : 'text-lg',
              score > (criterion.maxScore - criterion.minScore) / 2 + criterion.minScore
                ? 'text-green-500'
                : score < (criterion.maxScore - criterion.minScore) / 2 + criterion.minScore
                ? 'text-orange-500'
                : 'text-foreground'
            )}
          >
            {score.toFixed(1)}
          </span>
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
        />
      )}

      {inputMode === 'stars' && (
        <StarInput
          criterion={criterion}
          value={score}
          onChange={handleScoreChange}
        />
      )}

      {inputMode === 'numeric' && (
        <NumericInput
          criterion={criterion}
          value={score}
          onChange={handleScoreChange}
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
                  'w-full px-2 py-1 text-xs rounded border border-border',
                  'bg-background resize-none',
                  'focus:outline-none focus:ring-1 focus:ring-ring'
                )}
                rows={2}
              />
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowNoteInput(false)}
              >
                Hide note
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowNoteInput(true)}
            >
              <MessageSquare className="w-3 h-3" />
              {note ? 'Edit note' : 'Add note'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Slider Input Component
 */
interface SliderInputProps {
  criterion: Criterion;
  value: number;
  onChange: (value: number) => void;
}

function SliderInput({ criterion, value, onChange }: SliderInputProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const range = criterion.maxScore - criterion.minScore;
  const percentage = ((value - criterion.minScore) / range) * 100;

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

  return (
    <div className="space-y-2">
      <div
        ref={sliderRef}
        className="relative h-2 rounded-full bg-muted cursor-pointer"
        onClick={handleSliderClick}
        onMouseMove={handleDrag}
      >
        {/* Filled track */}
        <motion.div
          className="absolute h-full rounded-full"
          style={{
            backgroundColor: criterion.color ?? '#6366f1',
            width: `${percentage}%`,
          }}
          initial={false}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Thumb */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md cursor-grab active:cursor-grabbing"
          style={{
            borderColor: criterion.color ?? '#6366f1',
            left: `${percentage}%`,
            marginLeft: '-8px',
          }}
          initial={false}
          animate={{ left: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
 * Star Input Component
 */
function StarInput({ criterion, value, onChange }: SliderInputProps) {
  const range = criterion.maxScore - criterion.minScore;
  const starCount = Math.min(10, range);
  const starValue = (value - criterion.minScore) / range * starCount;

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

        return (
          <button
            key={index}
            className="p-0.5 transition-transform hover:scale-110"
            onClick={() => handleStarClick(index)}
          >
            <Star
              className={cn(
                'w-5 h-5 transition-colors',
                filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : partial
                  ? 'fill-yellow-400/50 text-yellow-400'
                  : 'text-muted-foreground'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Numeric Input Component
 */
function NumericInput({ criterion, value, onChange }: SliderInputProps) {
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
      <button
        className={cn(
          'p-1.5 rounded-lg border border-border',
          'hover:bg-accent transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        onClick={handleDecrement}
        disabled={value <= criterion.minScore}
      >
        <Minus className="w-4 h-4" />
      </button>

      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={criterion.minScore}
        max={criterion.maxScore}
        step={0.1}
        className={cn(
          'w-16 text-center text-lg font-bold',
          'bg-transparent border border-border rounded-lg py-1',
          'focus:outline-none focus:ring-1 focus:ring-ring'
        )}
      />

      <button
        className={cn(
          'p-1.5 rounded-lg border border-border',
          'hover:bg-accent transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        onClick={handleIncrement}
        disabled={value >= criterion.maxScore}
      >
        <Plus className="w-4 h-4" />
      </button>
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
}

export function BulkCriteriaScoreInput({
  criteria,
  scores,
  inputMode,
  onScoreChange,
  className,
  compact = false,
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
        />
      ))}
    </div>
  );
}

export default CriteriaScoreInput;
