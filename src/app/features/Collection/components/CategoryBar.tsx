"use client";

import { motion } from "framer-motion";
import { CollectionGroup } from "../types";

interface CategoryBarProps {
  groups: CollectionGroup[];
  selectedGroupIds: Set<string>;
  onToggleGroup: (groupId: string) => void;
  className?: string;
}

/**
 * Thin horizontal category bar - replaces sidebar
 * Shows groups as compact pills/chips
 */
export function CategoryBar({
  groups,
  selectedGroupIds,
  onToggleGroup,
  className = ""
}: CategoryBarProps) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 min-h-[48px]">
        {groups.map((group) => {
          const isSelected = selectedGroupIds.has(group.id);
          const itemCount = group.items?.length || 0;

          return (
            <motion.button
              key={group.id}
              onClick={() => onToggleGroup(group.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200 whitespace-nowrap
                ${isSelected
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:bg-gray-800 hover:text-gray-300'
                }
              `}
            >
              <span className="font-semibold">{group.name}</span>
              {itemCount > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  isSelected 
                    ? 'bg-cyan-500/30 text-cyan-300' 
                    : 'bg-gray-700/50 text-gray-500'
                }`}>
                  {itemCount}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

