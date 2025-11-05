"use client";

import { motion } from "framer-motion";
import { Grid3X3, Trash2, X, CheckSquare, Square } from "lucide-react";

interface ComparisonActionsProps {
  selectedCount: number;
  totalCount: number;
  onBulkAssign: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function ComparisonActions({
  selectedCount,
  totalCount,
  onBulkAssign,
  onClearAll,
  onClose
}: ComparisonActionsProps) {
  return (
    <div 
      className="px-6 py-4 border-t flex items-center justify-between"
      style={{
        borderColor: 'rgba(71, 85, 105, 0.4)',
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.9) 0%,
            rgba(30, 41, 59, 0.95) 100%
          )
        `
      }}
    >
      {/* Left Side - Selection Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="flex items-center gap-1">
            {selectedCount > 0 ? (
              <CheckSquare className="w-4 h-4 text-blue-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>
              {selectedCount} of {totalCount} selected
            </span>
          </div>
        </div>

        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400"
          >
            Ready for bulk actions
          </motion.div>
        )}
      </div>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-3">
        {/* Clear All Button */}
        <button
          onClick={onClearAll}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-slate-300 hover:text-white"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Clear All</span>
        </button>

        {/* Bulk Assign Button */}
        <button
          onClick={onBulkAssign}
          disabled={selectedCount === 0}
          className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: selectedCount > 0 
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(16, 185, 129, 0.8))'
              : 'rgba(71, 85, 105, 0.5)',
            boxShadow: selectedCount > 0 
              ? '0 4px 15px rgba(34, 197, 94, 0.3)'
              : 'none',
            color: 'white'
          }}
        >
          <Grid3X3 className="w-4 h-4" />
          <span>
            Assign {selectedCount > 0 ? `${selectedCount}` : ''} to Grid
          </span>
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-slate-300 hover:text-white"
          style={{
            background: 'rgba(51, 65, 85, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.4)'
          }}
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>
    </div>
  );
}