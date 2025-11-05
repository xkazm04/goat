"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ItemGroup } from "@/types/backlog-groups";
import { CollectionItem } from "./CollectionItem";
import { CollectionGroupDivider } from "./CollectionGroupDivider";
import { Layers } from "lucide-react";

interface CollectionItemsPanelProps {
  groups: ItemGroup[];
  selectedGroupIds: Set<string>;
}

/**
 * CollectionItemsPanel - Main panel showing items from selected groups
 *
 * Displays items in a grid layout with group dividers
 * - Items organized by group
 * - Visual dividers between groups
 * - Drag & drop enabled
 * - Responsive grid layout
 */
export function CollectionItemsPanel({
  groups,
  selectedGroupIds
}: CollectionItemsPanelProps) {
  // Filter groups and prepare items
  const groupedItems = useMemo(() => {
    return groups
      .filter(group => selectedGroupIds.has(group.id))
      .map(group => ({
        groupId: group.id,
        groupName: group.name,
        items: group.items || [],
        itemCount: group.item_count || 0,
        category: group.category,
        subcategory: group.subcategory
      }));
  }, [groups, selectedGroupIds]);

  const totalItems = useMemo(() => {
    return groupedItems.reduce((sum, group) => sum + group.items.length, 0);
  }, [groupedItems]);

  // Empty state
  if (groupedItems.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No groups selected</p>
          <p className="text-xs text-gray-500 mt-1">Select groups from the left sidebar</p>
        </div>
      </div>
    );
  }

  // No items state
  if (totalItems === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No items in selected groups</p>
          <p className="text-xs text-gray-500 mt-1">
            {groupedItems.length} group{groupedItems.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
      {/* Scrollable content - reduced padding and spacing */}
      <div className="p-3 space-y-4">
        <AnimatePresence mode="popLayout">
          {groupedItems.map((group, groupIndex) => (
            <motion.div
              key={group.groupId}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{
                delay: groupIndex * 0.08,
                duration: 0.4,
                ease: "easeOut"
              }}
            >
              {/* Group Divider */}
              <CollectionGroupDivider
                groupName={group.groupName}
                itemCount={group.items.length}
                totalItemCount={group.itemCount}
                category={group.category}
                subcategory={group.subcategory}
              />

              {/* Items Grid - More columns with smaller items */}
              {group.items.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-2 mt-3"
                >
                  {group.items.map((item, itemIndex) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        delay: itemIndex * 0.015,
                        duration: 0.3,
                        ease: "easeOut"
                      }}
                    >
                      <CollectionItem
                        item={item}
                        groupId={group.groupId}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 py-6 text-center"
                >
                  <p className="text-xs text-gray-500">No items loaded yet</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Scroll gradient indicators - enhanced */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-gray-900 via-gray-900/80 to-transparent pointer-events-none z-10"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent pointer-events-none z-10"
      />

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(6, 182, 212, 0.6), rgba(59, 130, 246, 0.6));
          border-radius: 4px;
          transition: background 0.3s;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(6, 182, 212, 0.8), rgba(59, 130, 246, 0.8));
        }
      `}</style>
    </div>
  );
}
