'use client';

/**
 * TierBoundarySlider
 * Interactive visual slider for adjusting tier boundaries on a distribution bar.
 * Shows color-coded zones with item count bubbles and supports drag-to-adjust.
 * Includes Auto-Optimize button that compares all available algorithms.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, GripVertical, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThresholdStore } from '@/stores/threshold-store';
import { calculateTierBoundaries } from '@/lib/tiers/TierCalculator';
import { TIER_COLORS } from '@/lib/tiers/constants';
import type { TierAlgorithm, ExtendedTierLabel } from '@/lib/tiers/types';

const ALGORITHMS: { id: TierAlgorithm; label: string }[] = [
  { id: 'equal', label: 'Equal' },
  { id: 'pyramid', label: 'Pyramid' },
  { id: 'bell', label: 'Bell' },
  { id: 'kmeans', label: 'K-means' },
  { id: 'percentile', label: 'Percentile' },
];

const TIER_LABELS: ExtendedTierLabel[] = ['S', 'A', 'B', 'C', 'D', 'F'];

interface TierBoundarySliderProps {
  listSize: number;
  tierCount: number;
  /** Current number of filled items per position (sparse) */
  filledPositions?: boolean[];
  className?: string;
}

/**
 * Calculate Goodness of Variance Fit (GVF) for a boundary set.
 * Higher is better (0-1 scale). Measures how well boundaries
 * separate the items into natural groupings.
 */
function calculateGVF(
  boundaries: number[],
  listSize: number,
  filledPositions: boolean[]
): number {
  const filledCount = filledPositions.filter(Boolean).length;
  if (filledCount <= 1) return 1;

  // Mean position of all filled items
  let sumPositions = 0;
  filledPositions.forEach((filled, pos) => {
    if (filled) sumPositions += pos;
  });
  const globalMean = sumPositions / filledCount;

  // Total sum of squared deviations from global mean
  let sdam = 0;
  filledPositions.forEach((filled, pos) => {
    if (filled) sdam += (pos - globalMean) ** 2;
  });

  if (sdam === 0) return 1;

  // Sum of squared deviations from class means
  let sdcm = 0;
  for (let t = 0; t < boundaries.length - 1; t++) {
    const start = boundaries[t];
    const end = boundaries[t + 1];
    let classSum = 0;
    let classCount = 0;
    for (let p = start; p < end; p++) {
      if (filledPositions[p]) {
        classSum += p;
        classCount++;
      }
    }
    if (classCount > 0) {
      const classMean = classSum / classCount;
      for (let p = start; p < end; p++) {
        if (filledPositions[p]) {
          sdcm += (p - classMean) ** 2;
        }
      }
    }
  }

  return (sdam - sdcm) / sdam;
}

export function TierBoundarySlider({
  listSize,
  tierCount,
  filledPositions,
  className,
}: TierBoundarySliderProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const {
    currentBoundaries,
    setBoundaries,
    selectedAlgorithm,
    setAlgorithm,
    originalBoundaries,
  } = useThresholdStore();

  // Initialize boundaries if empty
  const boundaries = useMemo(() => {
    if (currentBoundaries.length > 0) return currentBoundaries;
    return calculateTierBoundaries(listSize, tierCount, 'equal');
  }, [currentBoundaries, listSize, tierCount]);

  // Calculate items per tier for count bubbles
  const filled = useMemo(
    () => filledPositions || Array(listSize).fill(false),
    [filledPositions, listSize]
  );

  const tierDistribution = useMemo(() => {
    const dist: number[] = [];
    for (let t = 0; t < boundaries.length - 1; t++) {
      let count = 0;
      for (let p = boundaries[t]; p < boundaries[t + 1]; p++) {
        if (filled[p]) count++;
      }
      dist.push(count);
    }
    return dist;
  }, [boundaries, filled]);

  const totalFilled = useMemo(
    () => filled.filter(Boolean).length,
    [filled]
  );

  // Auto-optimize: run all algorithms and pick best GVF
  const [optimizing, setOptimizing] = useState(false);
  const [bestAlgorithm, setBestAlgorithm] = useState<{ id: TierAlgorithm; gvf: number } | null>(null);

  const handleAutoOptimize = useCallback(() => {
    setOptimizing(true);

    // Run each algorithm and score
    let best: { id: TierAlgorithm; gvf: number; boundaries: number[] } | null = null;

    for (const algo of ALGORITHMS) {
      const bounds = calculateTierBoundaries(listSize, tierCount, algo.id);
      const gvf = calculateGVF(bounds, listSize, filled);
      if (!best || gvf > best.gvf) {
        best = { id: algo.id, gvf, boundaries: bounds };
      }
    }

    if (best) {
      setBestAlgorithm({ id: best.id, gvf: best.gvf });
      setAlgorithm(best.id);
      setBoundaries(best.boundaries);
    }

    setTimeout(() => setOptimizing(false), 300);
  }, [listSize, tierCount, filled, setAlgorithm, setBoundaries]);

  // Handle boundary drag
  const handlePointerDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    setDraggingIndex(index);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingIndex === null || !barRef.current) return;

    const rect = barRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newPosition = Math.round(fraction * listSize);

    // Enforce min gap of 1 between boundaries
    const newBounds = [...boundaries];
    const minPos = (draggingIndex > 0 ? boundaries[draggingIndex - 1] : 0) + 1;
    const maxPos = (draggingIndex < boundaries.length - 1 ? boundaries[draggingIndex + 1] : listSize) - 1;

    newBounds[draggingIndex] = Math.max(minPos, Math.min(maxPos, newPosition));
    setBoundaries(newBounds);
  }, [draggingIndex, boundaries, listSize, setBoundaries]);

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  // Reset to original
  const handleReset = useCallback(() => {
    if (originalBoundaries.length > 0) {
      setBoundaries(originalBoundaries);
    } else {
      setBoundaries(calculateTierBoundaries(listSize, tierCount, 'equal'));
    }
    setBestAlgorithm(null);
  }, [originalBoundaries, listSize, tierCount, setBoundaries]);

  // Get tier color for segment
  const getTierColor = (index: number) => {
    const label = TIER_LABELS[index] || 'D';
    return TIER_COLORS[label]?.primary || '#64748b';
  };

  // Internal boundaries (exclude first=0 and last=listSize)
  const draggableBoundaries = boundaries.slice(1, -1);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Tier Boundaries
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReset}
            className="p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors"
            title="Reset boundaries"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleAutoOptimize}
            disabled={optimizing || totalFilled === 0}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
              'bg-brand/10 text-brand-hover hover:bg-brand/20 border border-brand/20',
              optimizing && 'animate-pulse',
              totalFilled === 0 && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Sparkles className="w-3 h-3" />
            {optimizing ? 'Analyzing...' : 'Auto-Optimize'}
          </button>
        </div>
      </div>

      {/* Algorithm recommendation badge */}
      <AnimatePresence>
        {bestAlgorithm && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-[10px] text-brand-hover/70"
          >
            Best fit: <span className="font-semibold">{ALGORITHMS.find(a => a.id === bestAlgorithm.id)?.label}</span>
            {' '}({(bestAlgorithm.gvf * 100).toFixed(0)}% GVF)
          </motion.div>
        )}
      </AnimatePresence>

      {/* Distribution bar */}
      <div
        ref={barRef}
        className="relative h-10 rounded-lg overflow-visible cursor-crosshair select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Tier color segments */}
        <div className="absolute inset-0 flex rounded-lg overflow-hidden">
          {boundaries.slice(0, -1).map((start, i) => {
            const end = boundaries[i + 1] || listSize;
            const width = ((end - start) / listSize) * 100;
            const color = getTierColor(i);
            return (
              <div
                key={`seg-${i}`}
                className="relative h-full flex items-center justify-center transition-all duration-200"
                style={{
                  width: `${width}%`,
                  backgroundColor: `${color}22`,
                  borderRight: i < boundaries.length - 2 ? `1px solid ${color}44` : 'none',
                }}
              >
                {/* Tier label + count bubble */}
                {width > 5 && (
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className="text-[10px] font-black opacity-60"
                      style={{ color }}
                    >
                      {TIER_LABELS[i] || `T${i + 1}`}
                    </span>
                    <span
                      className="px-1.5 py-0 rounded-full text-[9px] font-semibold"
                      style={{
                        backgroundColor: `${color}30`,
                        color,
                      }}
                    >
                      {tierDistribution[i] || 0}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Draggable boundary handles */}
        {draggableBoundaries.map((pos, i) => {
          const left = (pos / listSize) * 100;
          const boundaryIndex = i + 1; // Skip boundary[0] which is always 0
          return (
            <motion.div
              key={`handle-${i}`}
              className={cn(
                'absolute top-0 bottom-0 w-4 -ml-2 z-10 cursor-col-resize',
                'flex items-center justify-center',
                draggingIndex === boundaryIndex && 'z-20'
              )}
              style={{ left: `${left}%` }}
              onPointerDown={(e) => handlePointerDown(boundaryIndex, e)}
            >
              {/* Handle line */}
              <div
                className={cn(
                  'w-0.5 h-full transition-colors',
                  draggingIndex === boundaryIndex
                    ? 'bg-brand-hover shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                    : 'bg-slate-500/50 hover:bg-brand-hover/70'
                )}
              />
              {/* Grip icon */}
              <div
                className={cn(
                  'absolute top-1/2 -translate-y-1/2',
                  'w-4 h-6 rounded-sm flex items-center justify-center',
                  'bg-slate-800 border transition-colors',
                  draggingIndex === boundaryIndex
                    ? 'border-brand-hover shadow-lg shadow-brand/20'
                    : 'border-slate-600 hover:border-brand-hover/50'
                )}
              >
                <GripVertical className="w-2.5 h-2.5 text-slate-400" />
              </div>
              {/* Position tooltip on drag */}
              {draggingIndex === boundaryIndex && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-800 border border-brand/30 text-[9px] text-brand-hover font-mono whitespace-nowrap"
                >
                  #{pos}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Position scale */}
      <div className="flex justify-between px-0.5">
        <span className="text-[9px] text-slate-600 font-mono">1</span>
        <span className="text-[9px] text-slate-600 font-mono">{Math.round(listSize / 2)}</span>
        <span className="text-[9px] text-slate-600 font-mono">{listSize}</span>
      </div>

      {/* Algorithm selector chips */}
      <div className="flex flex-wrap gap-1">
        {ALGORITHMS.map((algo) => (
          <button
            key={algo.id}
            onClick={() => {
              setAlgorithm(algo.id);
              const bounds = calculateTierBoundaries(listSize, tierCount, algo.id);
              setBoundaries(bounds);
            }}
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border',
              selectedAlgorithm === algo.id
                ? 'bg-brand/15 text-brand-hover border-brand/30'
                : 'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:text-slate-300 hover:border-slate-600'
            )}
          >
            {algo.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TierBoundarySlider;
