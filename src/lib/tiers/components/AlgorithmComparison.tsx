'use client';

/**
 * AlgorithmComparison Component
 * Visualizes and compares different tier algorithms
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TierDefinition } from '../types';
import type { AlgorithmResult, AdvancedTierAlgorithm, AlgorithmComparison as AlgorithmComparisonType } from '../algorithms/types';
import { ALGORITHM_INFO } from '../algorithms';

interface AlgorithmComparisonProps {
  results: AlgorithmResult[];
  comparison?: AlgorithmComparisonType;
  tiers: TierDefinition[];
  listSize: number;
  selectedAlgorithm?: AdvancedTierAlgorithm;
  onSelectAlgorithm?: (algorithm: AdvancedTierAlgorithm) => void;
  compact?: boolean;
}

/**
 * Get color for an algorithm
 */
function getAlgorithmColor(algorithm: AdvancedTierAlgorithm): string {
  const colors: Record<AdvancedTierAlgorithm, string> = {
    elo: '#8B5CF6',
    kmeans: '#3B82F6',
    jenks: '#10B981',
    hybrid: '#F59E0B',
    percentile: '#EC4899',
    equal: '#6B7280',
    pyramid: '#EF4444',
    bell: '#14B8A6',
    statistical: '#6366F1',
    custom: '#78716C',
  };
  return colors[algorithm] || '#6B7280';
}

/**
 * Boundary visualization bar
 */
function BoundaryBar({
  boundaries,
  listSize,
  color,
  tiers,
}: {
  boundaries: number[];
  listSize: number;
  color: string;
  tiers: TierDefinition[];
}) {
  const segments = useMemo(() => {
    const result = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i];
      const end = boundaries[i + 1];
      const width = ((end - start) / listSize) * 100;
      const tier = tiers[i];

      result.push({
        start,
        end,
        width,
        tier,
        label: tier?.label || `T${i + 1}`,
      });
    }
    return result;
  }, [boundaries, listSize, tiers]);

  return (
    <div className="h-6 flex rounded overflow-hidden">
      {segments.map((segment, idx) => (
        <div
          key={idx}
          className="flex items-center justify-center text-xs font-medium text-white"
          style={{
            width: `${segment.width}%`,
            backgroundColor: segment.tier?.color?.primary || color,
            opacity: 0.8 + (idx % 2) * 0.2,
          }}
        >
          {segment.width > 8 && segment.label}
        </div>
      ))}
    </div>
  );
}

/**
 * Algorithm card
 */
function AlgorithmCard({
  result,
  info,
  tiers,
  listSize,
  isSelected,
  onSelect,
}: {
  result: AlgorithmResult;
  info: (typeof ALGORITHM_INFO)[AdvancedTierAlgorithm];
  tiers: TierDefinition[];
  listSize: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const color = getAlgorithmColor(result.algorithm);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`p-4 rounded-xl cursor-pointer transition-colors ${
        isSelected
          ? 'bg-zinc-800 border-2 border-emerald-500'
          : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h4 className="font-medium text-white">{info.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              result.confidence >= 80
                ? 'bg-emerald-500/20 text-emerald-400'
                : result.confidence >= 60
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {result.confidence}%
          </span>
          <span className="text-xs text-zinc-500">
            {result.executionTime.toFixed(1)}ms
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{info.description}</p>

      {/* Boundary visualization */}
      <BoundaryBar
        boundaries={result.boundaries}
        listSize={listSize}
        color={color}
        tiers={tiers}
      />

      {/* Tier sizes */}
      <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
        {result.boundaries.slice(0, -1).map((start, idx) => {
          const end = result.boundaries[idx + 1];
          return (
            <span key={idx} className="px-1.5 py-0.5 bg-zinc-800 rounded">
              {end - start}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * Comparison details panel
 */
function ComparisonDetails({
  result,
  info,
}: {
  result: AlgorithmResult;
  info: (typeof ALGORITHM_INFO)[AdvancedTierAlgorithm];
}) {
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
      <h4 className="font-medium text-white mb-4">{info.name} Details</h4>

      {/* Pros & Cons */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h5 className="text-xs font-medium text-zinc-400 mb-2">Pros</h5>
          <ul className="space-y-1">
            {info.pros.map((pro, idx) => (
              <li key={idx} className="text-sm text-emerald-400 flex items-start gap-1">
                <span className="mt-1">+</span>
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="text-xs font-medium text-zinc-400 mb-2">Cons</h5>
          <ul className="space-y-1">
            {info.cons.map((con, idx) => (
              <li key={idx} className="text-sm text-amber-400 flex items-start gap-1">
                <span className="mt-1">-</span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Metadata */}
      {result.metadata && Object.keys(result.metadata).length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-zinc-400 mb-2">Metrics</h5>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(result.metadata)
              .filter(([, value]) => typeof value === 'number')
              .slice(0, 6)
              .map(([key, value]) => (
                <div key={key} className="p-2 bg-zinc-800 rounded">
                  <div className="text-xs text-zinc-500 truncate">{key}</div>
                  <div className="text-sm font-medium text-white">
                    {typeof value === 'number' ? value.toFixed(2) : String(value)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AlgorithmComparison({
  results,
  comparison,
  tiers,
  listSize,
  selectedAlgorithm,
  onSelectAlgorithm,
  compact = false,
}: AlgorithmComparisonProps) {
  const [expandedAlgorithm, setExpandedAlgorithm] = useState<AdvancedTierAlgorithm | null>(null);

  const selectedResult = useMemo(
    () => results.find((r) => r.algorithm === selectedAlgorithm),
    [results, selectedAlgorithm]
  );

  const handleSelect = (algorithm: AdvancedTierAlgorithm) => {
    onSelectAlgorithm?.(algorithm);
    setExpandedAlgorithm(algorithm === expandedAlgorithm ? null : algorithm);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Agreement indicator */}
        {comparison && (
          <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
            <span className="text-sm text-zinc-400">Algorithm Agreement</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    comparison.agreement >= 80
                      ? 'bg-emerald-500'
                      : comparison.agreement >= 60
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${comparison.agreement}%` }}
                />
              </div>
              <span className="text-sm font-medium text-white">{comparison.agreement}%</span>
            </div>
          </div>
        )}

        {/* Compact algorithm list */}
        <div className="flex flex-wrap gap-2">
          {results.map((result) => {
            const info = ALGORITHM_INFO[result.algorithm];
            const color = getAlgorithmColor(result.algorithm);
            const isSelected = result.algorithm === selectedAlgorithm;

            return (
              <button
                key={result.algorithm}
                onClick={() => handleSelect(result.algorithm)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-zinc-800 border border-emerald-500'
                    : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-white">{info.name}</span>
                <span
                  className={`text-xs ${
                    result.confidence >= 80
                      ? 'text-emerald-400'
                      : result.confidence >= 60
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {result.confidence}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Algorithm Comparison</h3>
        {comparison && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">Agreement:</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${comparison.agreement}%` }}
                  className={`h-full rounded-full ${
                    comparison.agreement >= 80
                      ? 'bg-emerald-500'
                      : comparison.agreement >= 60
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-white">{comparison.agreement}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {comparison?.recommendation && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-blue-400 mb-1">Recommendation</div>
              <p className="text-sm text-zinc-300">{comparison.recommendation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Algorithm grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((result) => {
          const info = ALGORITHM_INFO[result.algorithm];
          if (!info) return null;

          return (
            <AlgorithmCard
              key={result.algorithm}
              result={result}
              info={info}
              tiers={tiers}
              listSize={listSize}
              isSelected={result.algorithm === selectedAlgorithm}
              onSelect={() => handleSelect(result.algorithm)}
            />
          );
        })}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expandedAlgorithm && selectedResult && ALGORITHM_INFO[expandedAlgorithm] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ComparisonDetails
              result={selectedResult}
              info={ALGORITHM_INFO[expandedAlgorithm]}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AlgorithmComparison;
