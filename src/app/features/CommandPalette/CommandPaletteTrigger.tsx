"use client";

import { motion } from "framer-motion";
import { Command, Keyboard } from "lucide-react";
import { useCommandPalette } from "./useCommandPalette";

interface CommandPaletteTriggerProps {
  className?: string;
  variant?: "floating" | "inline";
}

/**
 * A visual trigger button for the command palette
 * Can be used as a floating button or inline hint
 */
export function CommandPaletteTrigger({
  className = "",
  variant = "floating",
}: CommandPaletteTriggerProps) {
  const { openCommandPalette } = useCommandPalette();

  const isMac = typeof navigator !== "undefined" && navigator.platform?.includes("Mac");
  const shortcutKey = isMac ? "⌘" : "Ctrl";

  if (variant === "inline") {
    return (
      <button
        onClick={openCommandPalette}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10
          border border-white/10 text-white/60 hover:text-white/80 transition-all text-sm ${className}`}
        data-testid="command-palette-trigger-inline"
      >
        <Keyboard className="w-4 h-4" />
        <span>Quick Create</span>
        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono text-xs">
          {shortcutKey}+K
        </kbd>
      </button>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      onClick={openCommandPalette}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl
        bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-sm
        border border-white/10 text-white/70 hover:text-white hover:border-white/20
        shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30
        transition-all hover:scale-105 group ${className}`}
      data-testid="command-palette-trigger-floating"
    >
      <div className="flex items-center gap-1.5 text-white/40 group-hover:text-cyan-400 transition-colors">
        <Command className="w-3.5 h-3.5" />
      </div>
      <span className="text-sm font-medium">Quick Create</span>
      <div className="flex items-center gap-1 ml-1">
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono text-xs group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
          {shortcutKey}
        </kbd>
        <span className="text-white/30">+</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono text-xs group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
          K
        </kbd>
      </div>
    </motion.button>
  );
}
