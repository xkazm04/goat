"use client";

import { useState, useEffect, useCallback } from "react";
import { create } from "zustand";

interface CommandPaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Global state for command palette visibility
 */
export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

/**
 * Hook that sets up the global Cmd+K / Ctrl+K keyboard shortcut
 * Should be used in the root layout to ensure it works globally
 */
export function useCommandPaletteKeyboard() {
  const { isOpen, toggle, close } = useCommandPaletteStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
        return;
      }

      // Close on Escape (backup - the component also handles this)
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, toggle, close]);

  return { isOpen };
}

/**
 * Hook to use the command palette programmatically
 */
export function useCommandPalette() {
  const { isOpen, open, close, toggle } = useCommandPaletteStore();

  return {
    isOpen,
    openCommandPalette: open,
    closeCommandPalette: close,
    toggleCommandPalette: toggle,
  };
}
