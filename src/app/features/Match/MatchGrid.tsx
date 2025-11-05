"use client";

import { motion } from "framer-motion";
import { MatchGridPodium } from "./MatchPodium";
import { useListStore } from "@/stores/use-list-store";

export type AddingMode = 'start' | 'anywhere' | 'end';

export function MatchGrid() {
  const { currentList } = useListStore();
  
  if (!currentList) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No list selected</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative min-h-screen flex flex-col" // Full screen height
    >
      {/* Grid - Takes full space */}
      <div className="flex-1 flex flex-col min-h-0">
        <MatchGridPodium maxItems={currentList.size} />
      </div>
    </motion.div>
  );
}