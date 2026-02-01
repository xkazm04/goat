"use client";

import { memo, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trophy,
  ArrowUpRight,
  RefreshCw,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useComparison, useComparisonHistory } from "@/hooks/use-comparison";
import { compareItems, getComparisonSummary } from "@/lib/comparison/attribute-comparators";
import { AttributeRow, AttributeRowSkeleton } from "./AttributeRow";
import { WinnerBadge, DiffIndicator } from "./DiffIndicator";
import type { BacklogItemType } from "@/types/match";

interface ComparisonPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRankItem?: (itemId: string, position?: number) => void;
  onExport?: () => void;
  className?: string;
}

/**
 * ComparisonPanel - Full side-by-side comparison view
 */
export const ComparisonPanel = memo(function ComparisonPanel({
  isOpen,
  onClose,
  onRankItem,
  onExport,
  className = "",
}: ComparisonPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { selectedItems, recordComparison, clearSelection } = useComparison();
  const { history } = useComparisonHistory();

  // Run comparison
  const comparisonResult = useMemo(() => {
    if (selectedItems.length < 2) return null;
    return compareItems(selectedItems);
  }, [selectedItems]);

  const summary = useMemo(() => {
    if (!comparisonResult) return null;
    return getComparisonSummary(comparisonResult);
  }, [comparisonResult]);

  // Handle ranking from comparison
  const handleRank = useCallback(
    (itemId: string) => {
      recordComparison(itemId);
      onRankItem?.(itemId);
    },
    [recordComparison, onRankItem]
  );

  // Handle close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen || selectedItems.length < 2) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        />

        {/* Panel */}
        <motion.div
          ref={panelRef}
          className={`
            relative w-full max-w-5xl max-h-[90vh] overflow-hidden
            bg-gradient-to-b from-slate-900 to-slate-950
            rounded-2xl border border-slate-700/50
            shadow-2xl shadow-black/50
            ${className}
          `}
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20">
                  <Trophy className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Comparison
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedItems.length} items side-by-side
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onExport && (
                  <motion.button
                    onClick={onExport}
                    className="p-2 rounded-lg bg-slate-800/50 text-slate-400
                      hover:bg-slate-700/50 hover:text-white transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Export comparison"
                  >
                    <Download className="w-4 h-4" />
                  </motion.button>
                )}
                <motion.button
                  onClick={handleClose}
                  className="p-2 rounded-lg bg-slate-800/50 text-slate-400
                    hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <motion.div
                className="mt-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm text-slate-400">{summary}</p>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="overflow-auto max-h-[calc(90vh-180px)]">
            {/* Item headers */}
            <div className="sticky top-0 z-10 bg-slate-900/98 backdrop-blur-xl border-b border-slate-800/50">
              <div className="flex items-stretch">
                {/* Label column header */}
                <div className="w-28 shrink-0 p-4 bg-slate-900/50 border-r border-slate-800/40" />

                {/* Item columns */}
                <div
                  className="flex-1 grid"
                  style={{ gridTemplateColumns: `repeat(${selectedItems.length}, 1fr)` }}
                >
                  {selectedItems.map((item, index) => (
                    <ComparisonItemHeader
                      key={item.id}
                      item={item}
                      index={index}
                      isWinner={comparisonResult?.overallWinnerId === item.id}
                      winStats={
                        comparisonResult
                          ? {
                              wins: comparisonResult.totalWins[item.id] || 0,
                              total: comparisonResult.attributes.filter(
                                (a) => a.type !== "text"
                              ).length,
                              percentage: comparisonResult.winPercentages[item.id] || 0,
                            }
                          : undefined
                      }
                      onRank={() => handleRank(item.id)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Attribute rows */}
            <div className="divide-y divide-slate-800/30">
              {comparisonResult?.attributes.map((attr, index) => (
                <AttributeRow
                  key={attr.attribute}
                  attribute={attr}
                  itemCount={selectedItems.length}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={clearSelection}
                className="px-4 py-2 rounded-lg text-sm text-slate-400
                  hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                Clear Selection
              </button>

              <div className="flex items-center gap-3">
                {comparisonResult?.overallWinnerId && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-sm text-slate-400">Overall winner:</span>
                    <span className="text-sm font-semibold text-emerald-400">
                      {selectedItems.find((i) => i.id === comparisonResult.overallWinnerId)?.title}
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * ComparisonItemHeader - Header for each item column
 */
interface ComparisonItemHeaderProps {
  item: BacklogItemType;
  index: number;
  isWinner: boolean;
  winStats?: { wins: number; total: number; percentage: number };
  onRank?: () => void;
}

const ComparisonItemHeader = memo(function ComparisonItemHeader({
  item,
  index,
  isWinner,
  winStats,
  onRank,
}: ComparisonItemHeaderProps) {
  return (
    <motion.div
      className={`
        relative p-4 text-center border-r border-slate-800/40 last:border-0
        ${isWinner ? "bg-gradient-to-b from-emerald-500/10 to-transparent" : ""}
      `}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Winner crown */}
      {isWinner && (
        <motion.div
          className="absolute -top-2 left-1/2 -translate-x-1/2"
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
        >
          <div className="p-1.5 rounded-full bg-amber-500/20 border border-amber-500/40">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
        </motion.div>
      )}

      {/* Item image */}
      <div
        className={`
          w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden
          border-2 shadow-lg
          ${isWinner
            ? "border-emerald-500/50 shadow-emerald-500/20"
            : "border-slate-700/50 shadow-black/20"}
        `}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800
            flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-500">
              {item.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Item title */}
      <h3
        className={`font-semibold text-sm mb-2 line-clamp-2 ${isWinner ? "text-emerald-400" : "text-white"}`}
      >
        {item.title}
      </h3>

      {/* Win stats */}
      {winStats && winStats.total > 0 && (
        <WinnerBadge
          wins={winStats.wins}
          total={winStats.total}
          percentage={winStats.percentage}
          size="sm"
        />
      )}

      {/* Rank button */}
      {onRank && (
        <motion.button
          onClick={onRank}
          className={`
            mt-3 px-4 py-1.5 rounded-lg text-xs font-medium
            flex items-center justify-center gap-1 mx-auto
            transition-all
            ${isWinner
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
              : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"}
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowUpRight className="w-3 h-3" />
          Rank #{index + 1}
        </motion.button>
      )}
    </motion.div>
  );
});

export type { ComparisonPanelProps };
