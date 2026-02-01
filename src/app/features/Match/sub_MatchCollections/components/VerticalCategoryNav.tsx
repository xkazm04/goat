"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CollectionGroup } from "@/app/features/Collection/types";
import { cn } from "@/lib/utils";

interface VerticalCategoryNavProps {
  groups: CollectionGroup[];
  groupAvailableCounts: Record<string, number>;
  activeTab: string | 'all';
  onTabChange: (tabId: string | 'all') => void;
  totalItemCount: number;
}

/**
 * VerticalCategoryNav
 *
 * Ultra-compact vertical category navigation.
 * Uses only 40px width with vertical pills.
 * Categories displayed as abbreviated labels with full name on hover.
 *
 * Saves ~136px horizontal space compared to full sidebar.
 */
export const VerticalCategoryNav = memo(function VerticalCategoryNav({
  groups,
  groupAvailableCounts,
  activeTab,
  onTabChange,
  totalItemCount,
}: VerticalCategoryNavProps) {
  // Get first 2 letters of category name for abbreviation
  const getAbbrev = (name: string) => {
    const words = name.split(/\s+/);
    if (words.length > 1) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Filter groups with available items
  const visibleGroups = groups.filter(g => (groupAvailableCounts[g.id] ?? 0) > 0);

  return (
    <nav
      className="flex flex-col gap-1 py-2 px-1.5 w-11 shrink-0 border-r border-white/5 bg-black/20"
      aria-label="Category navigation"
    >
      {/* All Items */}
      <CategoryPill
        label="ALL"
        fullName="All Items"
        count={totalItemCount}
        isActive={activeTab === 'all'}
        onClick={() => onTabChange('all')}
      />

      {/* Divider */}
      <div className="h-px mx-1 my-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Category Pills */}
      <AnimatePresence mode="popLayout">
        {visibleGroups.map((group, index) => {
          const count = groupAvailableCounts[group.id] ?? 0;
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ delay: index * 0.02 }}
            >
              <CategoryPill
                label={getAbbrev(group.name)}
                fullName={group.name}
                count={count}
                isActive={activeTab === group.id}
                onClick={() => onTabChange(group.id)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </nav>
  );
});

interface CategoryPillProps {
  label: string;
  fullName: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

const CategoryPill = memo(function CategoryPill({
  label,
  fullName,
  count,
  isActive,
  onClick,
}: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-8 h-8 rounded-lg flex flex-col items-center justify-center",
        "transition-all duration-200 ease-out",
        isActive
          ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
          : "text-white/40 hover:text-white/70 hover:bg-white/5"
      )}
      aria-label={`${fullName} (${count} items)`}
      aria-pressed={isActive}
    >
      {/* Label */}
      <span className={cn(
        "text-[10px] font-bold tracking-tight leading-none",
        isActive && "text-cyan-300"
      )}>
        {label}
      </span>

      {/* Count dot */}
      <span className={cn(
        "mt-0.5 text-[8px] font-mono tabular-nums leading-none",
        isActive ? "text-cyan-400/80" : "text-white/30"
      )}>
        {count > 99 ? '99+' : count}
      </span>

      {/* Active indicator line */}
      {isActive && (
        <motion.div
          layoutId="category-indicator"
          className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-cyan-400"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}

      {/* Tooltip on hover */}
      <div className={cn(
        "absolute left-full ml-2 px-2 py-1 rounded-md z-50",
        "bg-gray-900/95 border border-white/10 backdrop-blur-sm",
        "text-xs text-white whitespace-nowrap",
        "opacity-0 pointer-events-none translate-x-1",
        "group-hover:opacity-100 group-hover:translate-x-0",
        "transition-all duration-150"
      )}>
        {fullName}
        <span className="ml-1.5 text-white/40">({count})</span>
      </div>
    </button>
  );
});

export default VerticalCategoryNav;
