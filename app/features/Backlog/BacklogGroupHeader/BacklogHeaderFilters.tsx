"use client";

import { motion } from "framer-motion";

interface BacklogHeaderFiltersProps {
  showEditorsPickOnly: boolean;
  onToggleEditorsPick: () => void;
}

export function BacklogHeaderFilters({
  onToggleEditorsPick
}: BacklogHeaderFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Editor's Pick Button */}
      <motion.button
        onClick={onToggleEditorsPick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        
        <span className="text-xs font-medium text-slate-400">Editor's Pick</span>
    
      </motion.button>
    </div>
  );
}
