"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Layers } from "lucide-react";

interface CollectionToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
}

/**
 * Floating button to open the collection panel when hidden
 */
export function CollectionToggleButton({
  isVisible,
  onToggle,
}: CollectionToggleButtonProps) {
  return (
    <AnimatePresence>
      {!isVisible && (
        <motion.button
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 24,
              opacity: { duration: 0.2 }
            }
          }}
          exit={{
            y: 100,
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.2 }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggle}
          aria-expanded={isVisible}
          aria-label="Open inventory panel"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/90 dark:bg-gray-950/90 backdrop-blur-xl border border-cyan-500/30 dark:border-cyan-400/20 text-cyan-400 dark:text-cyan-300 px-6 py-3 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center gap-2 font-bold tracking-wide"
          data-testid="open-inventory-btn"
        >
          <Layers className="w-4 h-4" />
          OPEN INVENTORY
        </motion.button>
      )}
    </AnimatePresence>
  );
}
