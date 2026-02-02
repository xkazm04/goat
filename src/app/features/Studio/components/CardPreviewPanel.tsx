'use client';

import { memo, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ScoreOverlayContainer } from '@/components/ui/score-overlays';
import { ELEVATION, Glow } from '@/components/visual';
import type { Criterion, CriterionScore } from '@/lib/criteria/types';

export interface CardPreviewPanelProps {
  /** Criteria to display on the preview card */
  criteria: Criterion[];
  /** Color index for each criterion (used for default colors) */
  criteriaColors?: string[];
}

// Default placeholder image gradient
const PLACEHOLDER_GRADIENT =
  'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e1b4b 100%)';

/**
 * CardPreviewPanel
 *
 * Live preview of an item card with configured score overlays.
 * Features:
 * - Mock card matching DropZoneCard styling
 * - Adjustable mock scores via sliders
 * - Real-time ScoreOverlayContainer with configured display types
 * - Gold border preview for position 1
 */
export const CardPreviewPanel = memo(function CardPreviewPanel({
  criteria,
  criteriaColors = [],
}: CardPreviewPanelProps) {
  // Mock scores state - one for each criterion
  const [mockScores, setMockScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    criteria.forEach((c) => {
      // Start with mid-high scores for a nice preview
      initial[c.id] = Math.round((c.maxScore - c.minScore) * 0.7 + c.minScore);
    });
    return initial;
  });

  // Update mock scores when criteria change
  useMemo(() => {
    criteria.forEach((c) => {
      if (mockScores[c.id] === undefined) {
        setMockScores((prev) => ({
          ...prev,
          [c.id]: Math.round((c.maxScore - c.minScore) * 0.7 + c.minScore),
        }));
      }
    });
  }, [criteria, mockScores]);

  // Convert to CriterionScore array for the overlay
  const scores: CriterionScore[] = useMemo(
    () =>
      criteria.map((c) => ({
        criterionId: c.id,
        score: mockScores[c.id] ?? c.maxScore * 0.7,
      })),
    [criteria, mockScores]
  );

  // Count visible overlays
  const visibleCount = criteria.filter(
    (c) => c.displayConfig?.displayType && c.displayConfig.displayType !== 'hidden'
  ).length;

  const handleScoreChange = useCallback((criterionId: string, value: number) => {
    setMockScores((prev) => ({
      ...prev,
      [criterionId]: value,
    }));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-400">Card Preview</h4>
        {visibleCount > 0 && (
          <span className="text-xs text-gray-500">
            {visibleCount} overlay{visibleCount !== 1 ? 's' : ''} visible
          </span>
        )}
      </div>

      {/* Mock Card */}
      <div className="flex justify-center">
        <div className="relative w-36 aspect-[4/5]">
          {/* Position #1 Glow Background */}
          <Glow
            color="gold"
            intensity="subtle"
            asBackground
            className="absolute inset-0 rounded-xl z-0 pointer-events-none"
          />

          {/* Gold Border - Position #1 */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none z-[35]"
            style={{
              boxShadow: 'inset 0 0 0 3px #fbbf24',
            }}
          />

          {/* Card container */}
          <motion.div
            className="relative w-full h-full rounded-xl overflow-hidden border-2 border-white/10 bg-gray-900/80 group"
            style={{ boxShadow: ELEVATION.medium }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Placeholder Image */}
            <div
              className="absolute inset-0"
              style={{ background: PLACEHOLDER_GRADIENT }}
            >
              {/* Subtle pattern overlay */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%),
                                   radial-gradient(circle at 70% 60%, rgba(255,255,255,0.08) 0%, transparent 40%)`,
                }}
              />
            </div>

            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20 pointer-events-none" />

            {/* Rank Badge (position 1) */}
            <motion.div
              className="absolute top-2 left-1/2 -translate-x-1/2 z-20"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div
                className="px-3 py-1 rounded-lg backdrop-blur-md border flex items-center gap-1.5 shadow-lg"
                style={{
                  backgroundColor: 'rgba(251, 191, 36, 0.15)',
                  borderColor: 'rgba(251, 191, 36, 0.5)',
                  boxShadow: '0 0 15px rgba(251, 191, 36, 0.3)',
                }}
              >
                <span
                  className="text-sm font-black tracking-wide"
                  style={{ color: '#fbbf24' }}
                >
                  1
                </span>
              </div>
            </motion.div>

            {/* Score Overlays */}
            <ScoreOverlayContainer
              criteria={criteria}
              scores={scores}
              animated={false}
            />
          </motion.div>

          {/* Title below card */}
          <p className="mt-2 text-[11px] font-medium text-white/90 text-center leading-tight">
            Example Item
          </p>
        </div>
      </div>

      {/* Mock Score Sliders */}
      {criteria.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-gray-800/50">
          <p className="text-xs text-gray-500">Adjust mock scores:</p>
          {criteria.map((criterion, idx) => {
            const color = criteriaColors[idx] || criterion.color || '#f59e0b';
            const isVisible =
              criterion.displayConfig?.displayType &&
              criterion.displayConfig.displayType !== 'hidden';

            return (
              <div
                key={criterion.id}
                className={`space-y-1 ${!isVisible ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{criterion.name}</span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color }}
                  >
                    {mockScores[criterion.id] ?? criterion.maxScore * 0.7}
                  </span>
                </div>
                <input
                  type="range"
                  value={mockScores[criterion.id] ?? criterion.maxScore * 0.7}
                  min={criterion.minScore}
                  max={criterion.maxScore}
                  step={0.5}
                  onChange={(e) => handleScoreChange(criterion.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-gray-700 cursor-pointer accent-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isVisible}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {criteria.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-500">
            Add criteria to see overlays
          </p>
        </div>
      )}
    </div>
  );
});

export default CardPreviewPanel;
