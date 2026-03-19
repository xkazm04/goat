"use client";

import { useCallback, useEffect, useRef } from "react";

import { useRankingStore } from "@/stores/ranking-store";

import { useTierFocus } from "../components/TierFocusProvider";

import type { BacklogItem } from "@/types/backlog-groups";

/**
 * Keyboard shortcut definitions
 */
export interface KeyboardShortcut {
  key: string;
  modifiers?: ("ctrl" | "shift" | "alt" | "meta")[];
  description: string;
  action: string;
  category: "navigation" | "assignment" | "actions" | "general";
}

/**
 * All tier list keyboard shortcuts
 */
export const TIER_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { key: "ArrowUp", description: "Move to previous tier", action: "moveFocusUp", category: "navigation" },
  { key: "ArrowDown", description: "Move to next tier", action: "moveFocusDown", category: "navigation" },
  { key: "ArrowLeft", description: "Move to previous item", action: "moveFocusLeft", category: "navigation" },
  { key: "ArrowRight", description: "Move to next item", action: "moveFocusRight", category: "navigation" },
  { key: "Home", description: "Move to first tier", action: "focusFirstTier", category: "navigation" },
  { key: "End", description: "Move to unranked pool", action: "focusUnranked", category: "navigation" },
  { key: "Tab", description: "Move to next interactive element", action: "tabNext", category: "navigation" },
  { key: "Tab", modifiers: ["shift"], description: "Move to previous interactive element", action: "tabPrev", category: "navigation" },

  // Quick tier assignment (1-9 keys)
  { key: "1", description: "Assign to tier 1 (S)", action: "assignToTier1", category: "assignment" },
  { key: "2", description: "Assign to tier 2 (A)", action: "assignToTier2", category: "assignment" },
  { key: "3", description: "Assign to tier 3 (B)", action: "assignToTier3", category: "assignment" },
  { key: "4", description: "Assign to tier 4 (C)", action: "assignToTier4", category: "assignment" },
  { key: "5", description: "Assign to tier 5 (D)", action: "assignToTier5", category: "assignment" },
  { key: "6", description: "Assign to tier 6 (F)", action: "assignToTier6", category: "assignment" },
  { key: "7", description: "Assign to tier 7", action: "assignToTier7", category: "assignment" },
  { key: "8", description: "Assign to tier 8", action: "assignToTier8", category: "assignment" },
  { key: "9", description: "Assign to tier 9", action: "assignToTier9", category: "assignment" },

  // Move item shortcuts
  { key: "ArrowUp", modifiers: ["shift"], description: "Move item to tier above", action: "moveItemUp", category: "actions" },
  { key: "ArrowDown", modifiers: ["shift"], description: "Move item to tier below", action: "moveItemDown", category: "actions" },
  { key: "ArrowLeft", modifiers: ["shift"], description: "Move item left in tier", action: "moveItemLeft", category: "actions" },
  { key: "ArrowRight", modifiers: ["shift"], description: "Move item right in tier", action: "moveItemRight", category: "actions" },

  // Actions
  { key: "Enter", description: "Open item detail", action: "openItemDetail", category: "actions" },
  { key: " ", description: "Open item detail", action: "openItemDetail", category: "actions" },
  { key: "Delete", description: "Remove from tier / move to unranked", action: "removeFromTier", category: "actions" },
  { key: "Backspace", description: "Remove from tier / move to unranked", action: "removeFromTier", category: "actions" },
  { key: "u", description: "Move item to unranked pool", action: "moveToUnranked", category: "actions" },

  // General
  { key: "?", description: "Show keyboard shortcuts help", action: "showHelp", category: "general" },
  { key: "Escape", description: "Close panel / exit keyboard mode", action: "escape", category: "general" },
  { key: "k", description: "Toggle keyboard navigation mode", action: "toggleKeyboardMode", category: "general" },
];

/**
 * Options for the keyboard navigation hook
 */
interface UseTierKeyboardNavigationOptions {
  enabled?: boolean;
  onShowHelp?: () => void;
  onOpenItemDetail?: (item: BacklogItem) => void;
  onEscape?: () => void;
}

/**
 * Hook for comprehensive tier list keyboard navigation
 */
export function useTierKeyboardNavigation(options: UseTierKeyboardNavigationOptions = {}) {
  const {
    enabled = true,
    onShowHelp,
    onOpenItemDetail,
    onEscape,
  } = options;

  const {
    focusPosition,
    isKeyboardNavigating,
    setKeyboardNavigating,
    moveFocusUp,
    moveFocusDown,
    moveFocusLeft,
    moveFocusRight,
    focusTier,
    focusUnrankedPool,
    clearFocus,
    announce,
    tiers,
    getFocusedItem,
    getFocusedTier,
    getItemsInTier,
  } = useTierFocus();

  // Ranking store actions
  const assignToTier = useRankingStore((state) => state.assignToTier);
  const removeFromTier = useRankingStore((state) => state.removeFromTier);
  const moveBetweenTiers = useRankingStore((state) => state.moveBetweenTiers);
  const moveWithinTier = useRankingStore((state) => state.moveWithinTier);
  const addToUnranked = useRankingStore((state) => state.addToUnranked);

  // Ref to track if we're handling a key
  const isHandlingKey = useRef(false);

  /**
   * Check if modifier keys match
   */
  const checkModifiers = useCallback(
    (e: KeyboardEvent, modifiers?: ("ctrl" | "shift" | "alt" | "meta")[]) => {
      const hasCtrl = modifiers?.includes("ctrl") ?? false;
      const hasShift = modifiers?.includes("shift") ?? false;
      const hasAlt = modifiers?.includes("alt") ?? false;
      const hasMeta = modifiers?.includes("meta") ?? false;

      return (
        e.ctrlKey === hasCtrl &&
        e.shiftKey === hasShift &&
        e.altKey === hasAlt &&
        e.metaKey === hasMeta
      );
    },
    []
  );

  /**
   * Assign focused item to a specific tier
   */
  const assignFocusedItemToTier = useCallback(
    (tierIndex: number) => {
      const item = getFocusedItem();
      if (!item) {
        announce("No item focused to assign", "assertive");
        return;
      }

      const targetTier = tiers[tierIndex];
      if (!targetTier) {
        announce(`Tier ${tierIndex + 1} does not exist`, "assertive");
        return;
      }

      // If item is in unranked pool or different tier, assign it
      if (focusPosition.isUnrankedPool) {
        assignToTier(item.id, targetTier.id, item);
        announce(`Assigned ${item.title} to tier ${targetTier.label}`, "assertive");
      } else if (focusPosition.tierId && focusPosition.tierId !== targetTier.id) {
        moveBetweenTiers(item.id, focusPosition.tierId, targetTier.id);
        announce(`Moved ${item.title} to tier ${targetTier.label}`, "assertive");
      }

      // Move focus to next item in original location
      moveFocusRight();
    },
    [
      getFocusedItem,
      tiers,
      focusPosition,
      assignToTier,
      moveBetweenTiers,
      announce,
      moveFocusRight,
    ]
  );

  /**
   * Move focused item up one tier
   */
  const moveItemTierUp = useCallback(() => {
    const item = getFocusedItem();
    const currentTier = getFocusedTier();

    if (!item || !currentTier) {
      announce("No item focused to move", "assertive");
      return;
    }

    const currentTierIndex = tiers.findIndex((t) => t.id === currentTier.id);
    if (currentTierIndex <= 0) {
      announce("Already in top tier", "polite");
      return;
    }

    const targetTier = tiers[currentTierIndex - 1];
    moveBetweenTiers(item.id, currentTier.id, targetTier.id);
    focusTier(targetTier.id);
    announce(`Moved ${item.title} up to tier ${targetTier.label}`, "assertive");
  }, [getFocusedItem, getFocusedTier, tiers, moveBetweenTiers, focusTier, announce]);

  /**
   * Move focused item down one tier
   */
  const moveItemTierDown = useCallback(() => {
    const item = getFocusedItem();
    const currentTier = getFocusedTier();

    if (!item || !currentTier) {
      announce("No item focused to move", "assertive");
      return;
    }

    const currentTierIndex = tiers.findIndex((t) => t.id === currentTier.id);
    if (currentTierIndex >= tiers.length - 1) {
      announce("Already in bottom tier", "polite");
      return;
    }

    const targetTier = tiers[currentTierIndex + 1];
    moveBetweenTiers(item.id, currentTier.id, targetTier.id);
    focusTier(targetTier.id);
    announce(`Moved ${item.title} down to tier ${targetTier.label}`, "assertive");
  }, [getFocusedItem, getFocusedTier, tiers, moveBetweenTiers, focusTier, announce]);

  /**
   * Move focused item left within tier
   */
  const moveItemWithinTierLeft = useCallback(() => {
    const item = getFocusedItem();
    const currentTier = getFocusedTier();

    if (!item || !currentTier || focusPosition.itemIndex <= 0) {
      return;
    }

    moveWithinTier(currentTier.id, focusPosition.itemIndex, focusPosition.itemIndex - 1);
    moveFocusLeft();
    announce(`Moved ${item.title} left`, "polite");
  }, [getFocusedItem, getFocusedTier, focusPosition.itemIndex, moveWithinTier, moveFocusLeft, announce]);

  /**
   * Move focused item right within tier
   */
  const moveItemWithinTierRight = useCallback(() => {
    const item = getFocusedItem();
    const currentTier = getFocusedTier();

    if (!item || !currentTier) return;

    const items = getItemsInTier(currentTier.id);
    if (focusPosition.itemIndex >= items.length - 1) return;

    moveWithinTier(currentTier.id, focusPosition.itemIndex, focusPosition.itemIndex + 1);
    moveFocusRight();
    announce(`Moved ${item.title} right`, "polite");
  }, [
    getFocusedItem,
    getFocusedTier,
    focusPosition.itemIndex,
    getItemsInTier,
    moveWithinTier,
    moveFocusRight,
    announce,
  ]);

  /**
   * Remove focused item from tier (move to unranked)
   */
  const removeFocusedFromTier = useCallback(() => {
    const item = getFocusedItem();
    const currentTier = getFocusedTier();

    if (!item) {
      announce("No item focused to remove", "assertive");
      return;
    }

    if (focusPosition.isUnrankedPool) {
      announce("Item is already in unranked pool", "polite");
      return;
    }

    if (currentTier) {
      removeFromTier(item.id, currentTier.id);
      addToUnranked(item.id, item);
      announce(`Removed ${item.title} from tier ${currentTier.label}`, "assertive");
      moveFocusRight();
    }
  }, [
    getFocusedItem,
    getFocusedTier,
    focusPosition.isUnrankedPool,
    removeFromTier,
    addToUnranked,
    announce,
    moveFocusRight,
  ]);

  /**
   * Handle keyboard event
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (isHandlingKey.current) return;

      // Don't handle if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key;

      // Toggle keyboard mode with 'k'
      if (key === "k" && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setKeyboardNavigating(!isKeyboardNavigating);
        if (!isKeyboardNavigating) {
          // Enter keyboard mode - focus first tier
          if (tiers.length > 0) {
            focusTier(tiers[0].id);
          }
          announce("Keyboard navigation enabled. Press arrow keys to navigate, ? for help.");
        } else {
          clearFocus();
          announce("Keyboard navigation disabled.");
        }
        return;
      }

      // Show help with '?'
      if (key === "?" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        onShowHelp?.();
        return;
      }

      // Only process remaining shortcuts if in keyboard mode
      if (!isKeyboardNavigating) return;

      isHandlingKey.current = true;

      try {
        // Escape - exit keyboard mode or close panel
        if (key === "Escape") {
          e.preventDefault();
          if (onEscape) {
            onEscape();
          } else {
            setKeyboardNavigating(false);
            clearFocus();
            announce("Keyboard navigation disabled.");
          }
          return;
        }

        // Navigation with shift = move item
        if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
          switch (key) {
            case "ArrowUp":
              e.preventDefault();
              moveItemTierUp();
              return;
            case "ArrowDown":
              e.preventDefault();
              moveItemTierDown();
              return;
            case "ArrowLeft":
              e.preventDefault();
              moveItemWithinTierLeft();
              return;
            case "ArrowRight":
              e.preventDefault();
              moveItemWithinTierRight();
              return;
          }
        }

        // Basic navigation (no modifiers)
        if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
          switch (key) {
            case "ArrowUp":
              e.preventDefault();
              moveFocusUp();
              return;
            case "ArrowDown":
              e.preventDefault();
              moveFocusDown();
              return;
            case "ArrowLeft":
              e.preventDefault();
              moveFocusLeft();
              return;
            case "ArrowRight":
              e.preventDefault();
              moveFocusRight();
              return;
            case "Home":
              e.preventDefault();
              if (tiers.length > 0) {
                focusTier(tiers[0].id);
                announce(`Moved to first tier: ${tiers[0].label}`);
              }
              return;
            case "End":
              e.preventDefault();
              focusUnrankedPool();
              return;
            case "Enter":
            case " ":
              e.preventDefault();
              const item = getFocusedItem();
              if (item) {
                onOpenItemDetail?.(item);
              }
              return;
            case "Delete":
            case "Backspace":
              e.preventDefault();
              removeFocusedFromTier();
              return;
            case "u":
              e.preventDefault();
              removeFocusedFromTier();
              return;
          }

          // Number keys 1-9 for quick tier assignment
          const num = parseInt(key, 10);
          if (num >= 1 && num <= 9) {
            e.preventDefault();
            assignFocusedItemToTier(num - 1);
            return;
          }
        }
      } finally {
        isHandlingKey.current = false;
      }
    },
    [
      enabled,
      isKeyboardNavigating,
      setKeyboardNavigating,
      tiers,
      focusTier,
      focusUnrankedPool,
      clearFocus,
      announce,
      onShowHelp,
      onEscape,
      moveFocusUp,
      moveFocusDown,
      moveFocusLeft,
      moveFocusRight,
      moveItemTierUp,
      moveItemTierDown,
      moveItemWithinTierLeft,
      moveItemWithinTierRight,
      removeFocusedFromTier,
      assignFocusedItemToTier,
      getFocusedItem,
      onOpenItemDetail,
    ]
  );

  // Attach global keyboard listener
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    isKeyboardNavigating,
    setKeyboardNavigating,
    focusPosition,
    shortcuts: TIER_KEYBOARD_SHORTCUTS,
  };
}

/**
 * Get shortcuts grouped by category
 */
export function getShortcutsByCategory() {
  const categories = {
    navigation: [] as KeyboardShortcut[],
    assignment: [] as KeyboardShortcut[],
    actions: [] as KeyboardShortcut[],
    general: [] as KeyboardShortcut[],
  };

  for (const shortcut of TIER_KEYBOARD_SHORTCUTS) {
    categories[shortcut.category].push(shortcut);
  }

  return categories;
}

/**
 * Format shortcut key for display
 */
export function formatShortcutKey(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.modifiers?.includes("ctrl")) parts.push("Ctrl");
  if (shortcut.modifiers?.includes("shift")) parts.push("Shift");
  if (shortcut.modifiers?.includes("alt")) parts.push("Alt");
  if (shortcut.modifiers?.includes("meta")) parts.push("Cmd");

  // Format special keys
  let keyDisplay = shortcut.key;
  switch (shortcut.key) {
    case " ":
      keyDisplay = "Space";
      break;
    case "ArrowUp":
      keyDisplay = "↑";
      break;
    case "ArrowDown":
      keyDisplay = "↓";
      break;
    case "ArrowLeft":
      keyDisplay = "←";
      break;
    case "ArrowRight":
      keyDisplay = "→";
      break;
    case "Escape":
      keyDisplay = "Esc";
      break;
    case "Delete":
      keyDisplay = "Del";
      break;
    case "Backspace":
      keyDisplay = "⌫";
      break;
  }

  parts.push(keyDisplay);
  return parts.join(" + ");
}

export type { UseTierKeyboardNavigationOptions };
