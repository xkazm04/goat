"use client";

import { motion } from "framer-motion";
import { Check, Loader2, CheckSquare, Square } from "lucide-react";
import { ItemGroup } from "@/types/backlog-groups";
import { getSubcategoryBackground } from "@/lib/helpers/getIcons";

interface CollectionGroupSelectorProps {
  groups: ItemGroup[];
  selectedGroupIds: Set<string>;
  onGroupToggle: (groupId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isLoading?: boolean;
}

/**
 * CollectionGroupSelector - Left sidebar with multi-select group buttons
 *
 * Displays a vertical list of group titles as toggle buttons
 * - Multi-select with visual feedback
 * - Compact design following compact-ui-design.md
 * - Smooth animations
 */
export function CollectionGroupSelector({
  groups,
  selectedGroupIds,
  onGroupToggle,
  onSelectAll,
  onDeselectAll,
  isLoading = false
}: CollectionGroupSelectorProps) {
  const allSelected = groups.length > 0 && selectedGroupIds.size === groups.length;
  const someSelected = selectedGroupIds.size > 0 && selectedGroupIds.size < groups.length;

  return (
    <div className="relative h-full flex flex-col bg-gradient-to-br from-gray-900/50 to-gray-800/50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-3 py-3 border-b border-cyan-500/20 bg-gradient-to-r from-gray-800/80 to-gray-800/60 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <div className="w-1 h-3 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full" />
            Groups
          </h3>
          <motion.span
            key={`${selectedGroupIds.size}-${groups.length}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
          >
            {selectedGroupIds.size}/{groups.length}
          </motion.span>
        </div>

        {/* Select All / Deselect All */}
        <div className="flex items-center gap-1.5">
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className={`flex-1 px-2.5 py-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 overflow-hidden relative ${
              allSelected
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                : someSelected
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                : 'bg-gray-700/50 text-gray-300 border border-gray-600/50 hover:border-cyan-500/40 hover:bg-gray-700/70'
            }`}
          >
            {/* Background shimmer for selected state */}
            {(allSelected || someSelected) && (
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-full h-full opacity-30"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)'
                }}
              />
            )}

            <motion.div
              animate={{ rotate: allSelected || someSelected ? 0 : 0 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {allSelected ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : someSelected ? (
                <Square className="w-3.5 h-3.5 opacity-70" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </motion.div>
            <span className="relative">{allSelected ? 'Deselect All' : 'Select All'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 custom-scrollbar">
        {isLoading && groups.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500">No groups available</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map((group, index) => (
              <GroupButton
                key={group.id}
                group={group}
                isSelected={selectedGroupIds.has(group.id)}
                onToggle={() => onGroupToggle(group.id)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(6, 182, 212, 0.5), rgba(59, 130, 246, 0.5));
          border-radius: 3px;
          transition: background 0.3s;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(6, 182, 212, 0.7), rgba(59, 130, 246, 0.7));
        }
      `}</style>
    </div>
  );
}

interface GroupButtonProps {
  group: ItemGroup;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}

function GroupButton({ group, isSelected, onToggle, index }: GroupButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        delay: index * 0.03,
        duration: 0.3,
        ease: "easeOut"
      }}
      whileHover={{
        scale: 1.02,
        x: 4,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={`relative w-full px-2.5 py-2 rounded-md text-left transition-all overflow-hidden group ${
        isSelected
          ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/20 border border-cyan-500/40 shadow-lg shadow-cyan-500/15'
          : 'bg-gray-800/50 border border-gray-700/60 hover:border-cyan-500/30 hover:bg-gray-800/70 hover:shadow-md'
      }`}
    >
      {/* Background Image */}
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden flex items-center justify-center transition-opacity group-hover:opacity-10">
        {group.subcategory && getSubcategoryBackground(group.subcategory)}
      </div>

      {/* Background shimmer for selected */}
      {isSelected && (
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 w-full h-full opacity-20"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), transparent)'
          }}
        />
      )}

      {/* Single Row: Checkbox + Name (Count) */}
      <div className="relative flex items-center gap-2">
        {/* Checkbox indicator - enhanced */}
        <motion.div
          animate={{
            scale: isSelected ? [1, 1.1, 1] : 1,
            rotate: isSelected ? [0, 5, -5, 0] : 0
          }}
          transition={{
            duration: 0.3,
            ease: "easeOut"
          }}
          className={`flex-shrink-0 w-3.5 h-3.5 rounded border-2 transition-all flex items-center justify-center ${
            isSelected
              ? 'bg-gradient-to-br from-cyan-400 to-blue-500 border-cyan-300 shadow-md shadow-cyan-500/50'
              : 'bg-gray-900/60 border-gray-600 group-hover:border-gray-500'
          }`}
        >
          {isSelected && (
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Check className="w-2.5 h-2.5 text-white font-bold" strokeWidth={3} />
            </motion.div>
          )}
        </motion.div>

        {/* Group name + count in single line */}
        <div className="flex-1 min-w-0 text-xs font-semibold text-white truncate">
          {group.name}
          {group.item_count !== undefined && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-[10px] font-mono ml-1.5 px-1 py-0.5 rounded ${
                isSelected
                  ? 'bg-cyan-500/30 text-cyan-200'
                  : 'text-gray-500 group-hover:text-gray-400'
              }`}
            >
              ({group.item_count})
            </motion.span>
          )}
        </div>
      </div>

      {/* Selection glow effect - enhanced */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 pointer-events-none"
        />
      )}

      {/* Left accent line for selected */}
      {isSelected && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-r"
        />
      )}
    </motion.button>
  );
}
