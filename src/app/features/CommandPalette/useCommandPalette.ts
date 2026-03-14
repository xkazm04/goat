"use client";

import { useState, useEffect, useCallback } from "react";
import { create } from "zustand";

interface CommandPaletteState {
  isOpen: boolean;
  initialQuery: string;
  open: () => void;
  openWithQuery: (query: string) => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Global state for command palette visibility
 */
export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  initialQuery: "",
  open: () => set({ isOpen: true, initialQuery: "" }),
  openWithQuery: (query: string) => set({ isOpen: true, initialQuery: query }),
  close: () => set({ isOpen: false, initialQuery: "" }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen, initialQuery: "" })),
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
  const { isOpen, open, openWithQuery, close, toggle } = useCommandPaletteStore();

  return {
    isOpen,
    openCommandPalette: open,
    openWithQuery,
    closeCommandPalette: close,
    toggleCommandPalette: toggle,
  };
}
