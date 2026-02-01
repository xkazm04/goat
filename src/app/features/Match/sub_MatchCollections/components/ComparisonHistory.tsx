"use client";

import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Clock,
  Trophy,
  ChevronRight,
  Trash2,
  RotateCcw,
  X,
} from "lucide-react";
import { useComparisonHistory, type ComparisonHistoryEntry } from "@/hooks/use-comparison";
import { formatDistanceToNow } from "date-fns";

interface ComparisonHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadComparison?: (historyId: string) => void;
  className?: string;
}

/**
 * ComparisonHistory - Panel showing recent comparisons
 */
export const ComparisonHistory = memo(function ComparisonHistory({
  isOpen,
  onClose,
  onLoadComparison,
  className = "",
}: ComparisonHistoryProps) {
  const { history, recentComparison, loadHistory, clearHistory, hasHistory } =
    useComparisonHistory();

  const handleLoadComparison = useCallback(
    (historyId: string) => {
      loadHistory(historyId);
      onLoadComparison?.(historyId);
    },
    [loadHistory, onLoadComparison]
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={`
          bg-slate-900/95 backdrop-blur-xl rounded-2xl
          border border-slate-700/50 shadow-xl shadow-black/30
          overflow-hidden ${className}
        `}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20">
              <History className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-medium text-white">Comparison History</span>
            <span className="text-xs text-slate-500">({history.length})</span>
          </div>

          <div className="flex items-center gap-1">
            {hasHistory && (
              <button
                onClick={clearHistory}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400
                  hover:bg-rose-500/10 transition-colors"
                title="Clear history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white
                hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-auto">
          {!hasHistory ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/50
                flex items-center justify-center">
                <History className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-sm text-slate-500">No comparison history yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Your recent comparisons will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/30">
              {history.map((entry, index) => (
                <HistoryItem
                  key={entry.id}
                  entry={entry}
                  index={index}
                  onLoad={() => handleLoadComparison(entry.id)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * HistoryItem - Single history entry
 */
interface HistoryItemProps {
  entry: ComparisonHistoryEntry & {
    items?: { id: string; title: string; image_url?: string }[];
    hasAllItems?: boolean;
  };
  index: number;
  onLoad: () => void;
}

const HistoryItem = memo(function HistoryItem({
  entry,
  index,
  onLoad,
}: HistoryItemProps) {
  const timeAgo = formatDistanceToNow(entry.timestamp, { addSuffix: true });
  const winnerTitle = entry.winnerId
    ? entry.itemTitles[entry.itemIds.indexOf(entry.winnerId)]
    : null;

  return (
    <motion.button
      onClick={onLoad}
      className="w-full p-3 text-left hover:bg-slate-800/30 transition-colors group"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-center gap-3">
        {/* Item thumbnails */}
        <div className="flex -space-x-2">
          {entry.items?.slice(0, 3).map((item, i) => (
            <div
              key={item.id}
              className="w-8 h-8 rounded-lg overflow-hidden border-2 border-slate-800
                bg-slate-700 shrink-0"
              style={{ zIndex: 3 - i }}
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center
                  text-xs font-bold text-slate-500">
                  {item.title.charAt(0)}
                </div>
              )}
            </div>
          )) || (
            // Fallback if items not loaded
            entry.itemIds.slice(0, 3).map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-lg border-2 border-slate-800
                  bg-slate-700 shrink-0"
                style={{ zIndex: 3 - i }}
              />
            ))
          )}
          {entry.itemIds.length > 3 && (
            <div
              className="w-8 h-8 rounded-lg border-2 border-slate-800
                bg-slate-700 flex items-center justify-center text-xs text-slate-400 shrink-0"
            >
              +{entry.itemIds.length - 3}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">
            {entry.itemTitles.slice(0, 2).join(" vs ")}
            {entry.itemTitles.length > 2 && ` +${entry.itemTitles.length - 2}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock className="w-3 h-3 text-slate-600" />
            <span className="text-xs text-slate-500">{timeAgo}</span>
            {winnerTitle && (
              <>
                <span className="text-slate-700">•</span>
                <div className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-amber-400 truncate max-w-[100px]">
                    {winnerTitle}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Load button */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <RotateCcw className="w-4 h-4 text-indigo-400" />
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
      </div>

      {/* Missing items warning */}
      {entry.hasAllItems === false && (
        <p className="text-xs text-amber-500/70 mt-1 ml-11">
          Some items no longer available
        </p>
      )}
    </motion.button>
  );
});

/**
 * ComparisonHistoryTrigger - Button to open history panel
 */
interface ComparisonHistoryTriggerProps {
  onClick: () => void;
  historyCount: number;
  className?: string;
}

export const ComparisonHistoryTrigger = memo(function ComparisonHistoryTrigger({
  onClick,
  historyCount,
  className = "",
}: ComparisonHistoryTriggerProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        relative p-2 rounded-lg bg-slate-800/50 text-slate-400
        hover:bg-slate-700/50 hover:text-white transition-colors
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="Comparison history"
    >
      <History className="w-4 h-4" />
      {historyCount > 0 && (
        <motion.span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500
            text-[10px] font-bold text-white flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          {historyCount > 9 ? "9+" : historyCount}
        </motion.span>
      )}
    </motion.button>
  );
});

export type { ComparisonHistoryProps, ComparisonHistoryTriggerProps };
