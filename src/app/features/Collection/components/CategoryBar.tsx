"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { CollectionGroup } from "../types";
import { useCollectionFiltersContext } from "../context/CollectionFiltersContext";

interface CategoryBarProps {
  groups?: CollectionGroup[];
  selectedGroupIds?: Set<string>;
  onToggleGroup?: (groupId: string) => void;
  className?: string;
}

/**
 * Thin horizontal category bar - replaces sidebar
 * Shows groups as compact pills/chips with animated sorting
 *
 * Features:
 * - Smooth slide-in animation when groups load
 * - Highlight flash effect when groups are reordered
 * - Layout animations for position changes
 *
 * Can consume filter state from context or use explicit props.
 * When used within CollectionFiltersProvider, props are optional.
 */
export function CategoryBar({
  groups: propGroups,
  selectedGroupIds: propSelectedGroupIds,
  onToggleGroup: propOnToggleGroup,
  className = ""
}: CategoryBarProps) {
  // Use context if available, otherwise fall back to props
  const context = useCollectionFiltersContext();

  const groups = propGroups ?? context.groups;
  const selectedGroupIds = propSelectedGroupIds ?? context.filter.selectedGroupIds;
  const onToggleGroup = propOnToggleGroup ?? context.toggleGroup;

  // Track if this is the initial load to trigger staggered entrance
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Track previous group order to detect changes
  const [prevGroupIds, setPrevGroupIds] = useState<string[]>([]);
  const [highlightedGroups, setHighlightedGroups] = useState<Set<string>>(new Set());

  // Detect group reordering and trigger highlight effect
  useEffect(() => {
    const currentGroupIds = groups.map(g => g.id);

    if (prevGroupIds.length > 0 && prevGroupIds.length === currentGroupIds.length) {
      // Check if order changed
      const orderChanged = prevGroupIds.some((id, index) => id !== currentGroupIds[index]);

      if (orderChanged) {
        // Highlight all groups briefly to show reordering happened
        setHighlightedGroups(new Set(currentGroupIds));

        // Clear highlights after animation duration
        setTimeout(() => {
          setHighlightedGroups(new Set());
        }, 800);
      }
    }

    setPrevGroupIds(currentGroupIds);
  }, [groups, prevGroupIds]);

  // Clear initial load flag after first render
  useEffect(() => {
    if (isInitialLoad && groups.length > 0) {
      const timer = setTimeout(() => setIsInitialLoad(false), groups.length * 50 + 500);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, groups.length]);

  return (
    <div className={`w-full overflow-x-auto ${className}`} data-testid="category-bar">
      <div className="flex items-center gap-2 px-3 py-2 min-h-[48px]">
        <AnimatePresence mode="popLayout">
          {groups.map((group, index) => {
            const isSelected = selectedGroupIds.has(group.id);
            const itemCount = group.items?.length || 0;
            const isHighlighted = highlightedGroups.has(group.id);

            return (
              <motion.button
                key={group.id}
                onClick={() => onToggleGroup(group.id)}
                // Initial entrance animation (staggered)
                initial={isInitialLoad ? {
                  opacity: 0,
                  y: -10,
                  scale: 0.9
                } : false}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1
                }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  transition: { duration: 0.2 }
                }}
                transition={{
                  duration: 0.3,
                  delay: isInitialLoad ? index * 0.05 : 0,
                  ease: [0.25, 0.46, 0.45, 0.94] // Custom easing curve
                }}
                // Layout animation for reordering
                layout
                layoutId={group.id}
                // Hover and tap animations
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid={`category-group-${group.id}-btn`}
                aria-pressed={isSelected}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all duration-200 whitespace-nowrap
                  ${isSelected
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:bg-gray-800 hover:text-gray-300'
                  }
                  ${isHighlighted ? 'ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-gray-900' : ''}
                `}
                style={{
                  // CSS-based highlight animation
                  animation: isHighlighted ? 'highlight-pulse 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : undefined
                }}
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
        </AnimatePresence>
      </div>
    </div>
  );
}





