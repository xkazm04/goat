'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type {
  Criterion,
  CriterionScore,
  CriterionDisplayPosition,
  CriterionDisplayType,
} from '@/lib/criteria/types';
import { RingScoreOverlay } from './RingScoreOverlay';
import { BarScoreOverlay } from './BarScoreOverlay';
import { LabelScoreOverlay } from './LabelScoreOverlay';

export interface ScoreOverlayContainerProps {
  /** Criteria with display configurations */
  criteria: Criterion[];
  /** Scores for each criterion */
  scores: CriterionScore[];
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate overlays */
  animated?: boolean;
}

// Default colors for criteria without explicit colors
const DEFAULT_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
];

// Position priority order (avoiding top-right for remove button)
const POSITION_PRIORITY: CriterionDisplayPosition[] = [
  'bottom-left',
  'bottom-right',
  'top-left',
  'bottom-center',
  'top-center',
  'top-right', // Last resort
];

// CSS classes for each position
const POSITION_CLASSES: Record<CriterionDisplayPosition, string> = {
  'top-left': 'top-1.5 left-1.5',
  'top-right': 'top-1.5 right-1.5',
  'top-center': 'top-1.5 left-1/2 -translate-x-1/2',
  'bottom-left': 'bottom-1.5 left-1.5',
  'bottom-right': 'bottom-1.5 right-1.5',
  'bottom-center': 'bottom-1.5 left-1/2 -translate-x-1/2',
};

interface ResolvedOverlay {
  criterion: Criterion;
  score: CriterionScore;
  position: CriterionDisplayPosition;
  displayType: CriterionDisplayType;
  color: string;
  index: number;
}

/**
 * Resolve positions for overlays, avoiding collisions
 * Respects explicit positions, auto-assigns others
 */
function resolvePositions(
  criteria: Criterion[],
  scores: CriterionScore[]
): ResolvedOverlay[] {
  // Filter to only visible criteria (not hidden) that have scores
  const visibleCriteria = criteria.filter((c) => {
    const displayType = c.displayConfig?.displayType ?? 'hidden';
    if (displayType === 'hidden') return false;

    // Check if there's a score for this criterion
    const hasScore = scores.some((s) => s.criterionId === c.id);
    return hasScore;
  });

  const usedPositions = new Set<CriterionDisplayPosition>();
  const result: ResolvedOverlay[] = [];

  // First pass: handle criteria with explicit positions
  visibleCriteria.forEach((criterion, idx) => {
    const score = scores.find((s) => s.criterionId === criterion.id);
    if (!score) return;

    const explicitPosition = criterion.displayConfig?.position;
    if (explicitPosition && !usedPositions.has(explicitPosition)) {
      usedPositions.add(explicitPosition);
      result.push({
        criterion,
        score,
        position: explicitPosition,
        displayType: criterion.displayConfig?.displayType ?? 'ring',
        color: criterion.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
        index: idx,
      });
    }
  });

  // Second pass: auto-assign positions to remaining criteria
  visibleCriteria.forEach((criterion, idx) => {
    // Skip if already positioned
    if (result.some((r) => r.criterion.id === criterion.id)) return;

    const score = scores.find((s) => s.criterionId === criterion.id);
    if (!score) return;

    // Find first available position
    const availablePosition = POSITION_PRIORITY.find((p) => !usedPositions.has(p));
    if (!availablePosition) return; // No more positions available

    usedPositions.add(availablePosition);
    result.push({
      criterion,
      score,
      position: availablePosition,
      displayType: criterion.displayConfig?.displayType ?? 'ring',
      color: criterion.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      index: idx,
    });
  });

  return result;
}

/**
 * ScoreOverlayContainer
 *
 * Orchestrates multiple score overlays on an item card.
 * - Filters out hidden criteria
 * - Assigns positions to avoid collisions
 * - Renders appropriate overlay component for each display type
 */
export const ScoreOverlayContainer = memo(function ScoreOverlayContainer({
  criteria,
  scores,
  className,
  animated = true,
}: ScoreOverlayContainerProps) {
  // Resolve which overlays to show and where
  const overlays = useMemo(
    () => resolvePositions(criteria, scores),
    [criteria, scores]
  );

  if (overlays.length === 0) return null;

  return (
    <div className={cn('absolute inset-0 pointer-events-none z-25', className)}>
      {overlays.map(({ criterion, score, position, displayType, color }) => {
        const positionClass = POSITION_CLASSES[position];
        const size = criterion.displayConfig?.size ?? 'md';
        const showName = criterion.displayConfig?.showName ?? false;

        return (
          <div key={criterion.id} className={cn('absolute', positionClass)}>
            {displayType === 'ring' && (
              <RingScoreOverlay
                score={score.score}
                maxScore={criterion.maxScore}
                size={size}
                color={color}
                name={criterion.name}
                showName={showName}
                animated={animated}
              />
            )}

            {displayType === 'bar' && (
              <BarScoreOverlay
                score={score.score}
                maxScore={criterion.maxScore}
                size={size}
                color={color}
                name={criterion.name}
                showName={showName}
                animated={animated}
              />
            )}

            {displayType === 'label' && (
              <LabelScoreOverlay
                score={score.score}
                maxScore={criterion.maxScore}
                size={size}
                color={color}
                name={criterion.name}
                animated={animated}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

export default ScoreOverlayContainer;
