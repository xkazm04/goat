"use client";

import { motion } from "framer-motion";
import MatchGridPodium from "./MatchGridPodium";
import { useListStore } from "@/app/stores/use-list-store";
import { useItemStore } from "@/app/stores/item-store";

export function MatchGrid() {
  const { currentList } = useListStore();
  const { gridItems } = useItemStore();
  
  if (!currentList) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No list selected</p>
      </div>
    );
  }
  const matchedCount = gridItems.filter(item => item.matched).length;
  const progressPercentage = (matchedCount / currentList.size) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative min-h-screen flex flex-col" // Full screen height
    >
      {/* Progress Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
        {progressPercentage > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-slate-400 mt-1"
          >
            Completion {progressPercentage.toFixed(1)}%
          </motion.p>
        )}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-1 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-300/90 to-gray-300/80 "
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Grid - Takes remaining space and expands */}
      <div className="flex-1 flex flex-col min-h-0">
        <MatchGridPodium maxItems={currentList.size} />
      </div>
    </motion.div>
  );
}