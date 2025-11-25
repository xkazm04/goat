"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { CollectionGroup, CollectionItem } from "@/app/features/Collection/types";
import { SimpleCollectionItem } from "@/app/features/Collection/SimpleCollectionItem";

interface CollectionGridProps {
  displayGroups: CollectionGroup[];
  showGroupHeaders?: boolean;
}

/**
 * Grid display for collection items
 * Filters out items that are marked as used
 */
export function CollectionGrid({
  displayGroups,
  showGroupHeaders = true,
}: CollectionGridProps) {
  // Filter out used items from each group
  const filteredGroups = displayGroups.map(group => ({
    ...group,
    items: (group.items || []).filter(item => !item.used)
  }));

  // Check if there are any visible items
  const hasVisibleItems = filteredGroups.some(group => (group.items?.length || 0) > 0);

  if (!hasVisibleItems) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: { delay: 0.3, duration: 0.2 }
        }}
        className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-600 gap-3"
      >
        <Search className="w-8 h-8 opacity-20" />
        <p className="text-sm">No items available in this category</p>
        <p className="text-xs text-gray-600">Items placed in the grid are hidden here</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {filteredGroups.map((group, groupIndex) => {
        // Skip groups with no visible items
        if (!group.items || group.items.length === 0) return null;

        return (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                delay: 0.15 + groupIndex * 0.05,
                duration: 0.3,
                ease: "easeOut"
              }
            }}
          >
            {showGroupHeaders && (
              <div className="flex items-center gap-3 mb-3">
                <h4 className="text-xs font-bold text-cyan-500/70 dark:text-cyan-400/60 uppercase tracking-widest">
                  {group.name}
                </h4>
                <span className="text-[10px] text-gray-500">({group.items.length})</span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-500/20 dark:from-cyan-400/10 to-transparent" />
              </div>
            )}

            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {group.items.map((item: CollectionItem) => (
                <SimpleCollectionItem
                  key={item.id}
                  item={item}
                  groupId={group.id}
                />
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
