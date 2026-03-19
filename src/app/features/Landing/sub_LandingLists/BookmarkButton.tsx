"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bookmark } from "lucide-react";
import { memo, useCallback } from "react";

import { DURATION } from "@/lib/animations/motion-presets";

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  className?: string;
}

export const BookmarkButton = memo(function BookmarkButton({
  isBookmarked,
  onToggle,
  size = "sm",
  className = "",
}: BookmarkButtonProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onToggle();
    },
    [onToggle]
  );

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const buttonSize = size === "sm" ? "p-1.5" : "p-2";

  return (
    <motion.button
      onClick={handleClick}
      className={`${buttonSize} rounded-lg backdrop-blur-sm transition-colors z-10
        ${isBookmarked
          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
          : "bg-black/40 text-white/60 hover:text-white hover:bg-black/60"
        }
        focus-ring ${className}`}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this list"}
      title={isBookmarked ? "Remove bookmark" : "Save for later"}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isBookmarked ? "filled" : "empty"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: DURATION.quick }}
        >
          <Bookmark
            className={`${iconSize} ${isBookmarked ? "fill-current" : ""}`}
          />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
});
