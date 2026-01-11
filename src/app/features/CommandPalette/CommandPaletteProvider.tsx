"use client";

import { useCommandPaletteKeyboard, useCommandPaletteStore } from "./useCommandPalette";
import { CommandPalette } from "./CommandPalette";

/**
 * Provider component that enables the global command palette
 * Add this to your root layout to enable Cmd+K / Ctrl+K anywhere in the app
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  // Set up global keyboard shortcut
  useCommandPaletteKeyboard();

  const { isOpen, close } = useCommandPaletteStore();

  return (
    <>
      {children}
      <CommandPalette isOpen={isOpen} onClose={close} />
    </>
  );
}
