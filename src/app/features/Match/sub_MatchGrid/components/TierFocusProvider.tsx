"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type { TierListTier } from "../../lib/tierPresets";
import type { BacklogItem } from "@/types/backlog-groups";

/**
 * Focus position in the tier list
 */
export interface TierFocusPosition {
  tierId: string | null;
  itemIndex: number;
  isUnrankedPool: boolean;
}

/**
 * Screen reader announcement types
 */
export type AnnouncementPriority = "polite" | "assertive";

export interface Announcement {
  message: string;
  priority: AnnouncementPriority;
  timestamp: number;
}

/**
 * Focus context state
 */
interface TierFocusContextState {
  // Focus state
  focusPosition: TierFocusPosition;
  isKeyboardNavigating: boolean;
  lastFocusedElement: HTMLElement | null;

  // Tier data for navigation
  tiers: TierListTier[];
  tierItems: Map<string, BacklogItem[]>;
  unrankedItems: BacklogItem[];

  // Announcements
  announcements: Announcement[];

  // Actions
  setFocusPosition: (position: TierFocusPosition) => void;
  setKeyboardNavigating: (enabled: boolean) => void;
  moveFocusUp: () => void;
  moveFocusDown: () => void;
  moveFocusLeft: () => void;
  moveFocusRight: () => void;
  focusTier: (tierId: string) => void;
  focusItem: (tierId: string, itemIndex: number) => void;
  focusUnrankedPool: (itemIndex?: number) => void;
  clearFocus: () => void;

  // Tier data setters
  setTiers: (tiers: TierListTier[]) => void;
  setTierItems: (items: Map<string, BacklogItem[]>) => void;
  setUnrankedItems: (items: BacklogItem[]) => void;

  // Announcements
  announce: (message: string, priority?: AnnouncementPriority) => void;
  clearAnnouncements: () => void;

  // Refs
  registerTierRef: (tierId: string, element: HTMLElement | null) => void;
  registerItemRef: (tierId: string, itemIndex: number, element: HTMLElement | null) => void;
  getTierRef: (tierId: string) => HTMLElement | null;
  getItemRef: (tierId: string, itemIndex: number) => HTMLElement | null;

  // Utilities
  getFocusedItem: () => BacklogItem | null;
  getFocusedTier: () => TierListTier | null;
  getTierAtIndex: (index: number) => TierListTier | null;
  getItemsInTier: (tierId: string) => BacklogItem[];
}

const TierFocusContext = createContext<TierFocusContextState | null>(null);

/**
 * Initial focus position
 */
const INITIAL_FOCUS: TierFocusPosition = {
  tierId: null,
  itemIndex: -1,
  isUnrankedPool: false,
};

interface TierFocusProviderProps {
  children: ReactNode;
  initialTiers?: TierListTier[];
}

/**
 * TierFocusProvider - Manages focus state for keyboard navigation in tier list
 */
export function TierFocusProvider({
  children,
  initialTiers = [],
}: TierFocusProviderProps) {
  // Focus state
  const [focusPosition, setFocusPositionState] = useState<TierFocusPosition>(INITIAL_FOCUS);
  const [isKeyboardNavigating, setKeyboardNavigating] = useState(false);
  const [lastFocusedElement, setLastFocusedElement] = useState<HTMLElement | null>(null);

  // Tier data
  const [tiers, setTiers] = useState<TierListTier[]>(initialTiers);
  const [tierItems, setTierItems] = useState<Map<string, BacklogItem[]>>(new Map());
  const [unrankedItems, setUnrankedItems] = useState<BacklogItem[]>([]);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Refs for DOM elements
  const tierRefs = useRef<Map<string, HTMLElement>>(new Map());
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Helper to create item ref key
  const getItemRefKey = useCallback((tierId: string, itemIndex: number) => {
    return `${tierId}:${itemIndex}`;
  }, []);

  // Register tier element ref
  const registerTierRef = useCallback((tierId: string, element: HTMLElement | null) => {
    if (element) {
      tierRefs.current.set(tierId, element);
    } else {
      tierRefs.current.delete(tierId);
    }
  }, []);

  // Register item element ref
  const registerItemRef = useCallback(
    (tierId: string, itemIndex: number, element: HTMLElement | null) => {
      const key = getItemRefKey(tierId, itemIndex);
      if (element) {
        itemRefs.current.set(key, element);
      } else {
        itemRefs.current.delete(key);
      }
    },
    [getItemRefKey]
  );

  // Get tier ref
  const getTierRef = useCallback((tierId: string) => {
    return tierRefs.current.get(tierId) || null;
  }, []);

  // Get item ref
  const getItemRef = useCallback(
    (tierId: string, itemIndex: number) => {
      return itemRefs.current.get(getItemRefKey(tierId, itemIndex)) || null;
    },
    [getItemRefKey]
  );

  // Set focus position and update DOM focus
  const setFocusPosition = useCallback((position: TierFocusPosition) => {
    setFocusPositionState(position);
  }, []);

  // Get items in a tier
  const getItemsInTier = useCallback(
    (tierId: string): BacklogItem[] => {
      return tierItems.get(tierId) || [];
    },
    [tierItems]
  );

  // Get tier at index
  const getTierAtIndex = useCallback(
    (index: number): TierListTier | null => {
      return tiers[index] || null;
    },
    [tiers]
  );

  // Get currently focused tier
  const getFocusedTier = useCallback((): TierListTier | null => {
    if (!focusPosition.tierId) return null;
    return tiers.find((t) => t.id === focusPosition.tierId) || null;
  }, [focusPosition.tierId, tiers]);

  // Get currently focused item
  const getFocusedItem = useCallback((): BacklogItem | null => {
    if (focusPosition.isUnrankedPool) {
      return unrankedItems[focusPosition.itemIndex] || null;
    }
    if (!focusPosition.tierId) return null;
    const items = getItemsInTier(focusPosition.tierId);
    return items[focusPosition.itemIndex] || null;
  }, [focusPosition, unrankedItems, getItemsInTier]);

  // Move focus up (to previous tier)
  const moveFocusUp = useCallback(() => {
    if (focusPosition.isUnrankedPool) {
      // Move from unranked pool to last tier
      if (tiers.length > 0) {
        const lastTier = tiers[tiers.length - 1];
        setFocusPositionState({
          tierId: lastTier.id,
          itemIndex: 0,
          isUnrankedPool: false,
        });
        announce(`Moved to tier ${lastTier.label}`);
      }
      return;
    }

    const currentTierIndex = tiers.findIndex((t) => t.id === focusPosition.tierId);
    if (currentTierIndex > 0) {
      const prevTier = tiers[currentTierIndex - 1];
      setFocusPositionState({
        tierId: prevTier.id,
        itemIndex: 0,
        isUnrankedPool: false,
      });
      announce(`Moved to tier ${prevTier.label}`);
    }
  }, [focusPosition, tiers]);

  // Move focus down (to next tier)
  const moveFocusDown = useCallback(() => {
    if (focusPosition.isUnrankedPool) return; // Already at bottom

    const currentTierIndex = tiers.findIndex((t) => t.id === focusPosition.tierId);

    if (currentTierIndex === -1) {
      // Not in any tier, focus first tier
      if (tiers.length > 0) {
        setFocusPositionState({
          tierId: tiers[0].id,
          itemIndex: 0,
          isUnrankedPool: false,
        });
        announce(`Moved to tier ${tiers[0].label}`);
      }
      return;
    }

    if (currentTierIndex < tiers.length - 1) {
      // Move to next tier
      const nextTier = tiers[currentTierIndex + 1];
      setFocusPositionState({
        tierId: nextTier.id,
        itemIndex: 0,
        isUnrankedPool: false,
      });
      announce(`Moved to tier ${nextTier.label}`);
    } else {
      // Move to unranked pool
      setFocusPositionState({
        tierId: null,
        itemIndex: 0,
        isUnrankedPool: true,
      });
      announce("Moved to unranked pool");
    }
  }, [focusPosition, tiers]);

  // Move focus left (to previous item in tier)
  const moveFocusLeft = useCallback(() => {
    if (focusPosition.itemIndex > 0) {
      const newIndex = focusPosition.itemIndex - 1;
      setFocusPositionState({
        ...focusPosition,
        itemIndex: newIndex,
      });

      // Get item name for announcement
      const item = focusPosition.isUnrankedPool
        ? unrankedItems[newIndex]
        : getItemsInTier(focusPosition.tierId || "")[newIndex];

      if (item) {
        announce(`${item.title}, item ${newIndex + 1}`);
      }
    }
  }, [focusPosition, unrankedItems, getItemsInTier]);

  // Move focus right (to next item in tier)
  const moveFocusRight = useCallback(() => {
    const items = focusPosition.isUnrankedPool
      ? unrankedItems
      : getItemsInTier(focusPosition.tierId || "");

    if (focusPosition.itemIndex < items.length - 1) {
      const newIndex = focusPosition.itemIndex + 1;
      setFocusPositionState({
        ...focusPosition,
        itemIndex: newIndex,
      });

      const item = items[newIndex];
      if (item) {
        announce(`${item.title}, item ${newIndex + 1}`);
      }
    }
  }, [focusPosition, unrankedItems, getItemsInTier]);

  // Focus a specific tier
  const focusTier = useCallback(
    (tierId: string) => {
      setFocusPositionState({
        tierId,
        itemIndex: 0,
        isUnrankedPool: false,
      });
      const tier = tiers.find((t) => t.id === tierId);
      if (tier) {
        announce(`Focused tier ${tier.label}`);
      }
    },
    [tiers]
  );

  // Focus a specific item
  const focusItem = useCallback((tierId: string, itemIndex: number) => {
    setFocusPositionState({
      tierId,
      itemIndex,
      isUnrankedPool: false,
    });
  }, []);

  // Focus unranked pool
  const focusUnrankedPool = useCallback((itemIndex: number = 0) => {
    setFocusPositionState({
      tierId: null,
      itemIndex,
      isUnrankedPool: true,
    });
    announce("Focused unranked pool");
  }, []);

  // Clear focus
  const clearFocus = useCallback(() => {
    setFocusPositionState(INITIAL_FOCUS);
    setKeyboardNavigating(false);
  }, []);

  // Announce message to screen readers
  const announce = useCallback((message: string, priority: AnnouncementPriority = "polite") => {
    setAnnouncements((prev) => [
      ...prev,
      { message, priority, timestamp: Date.now() },
    ]);
  }, []);

  // Clear announcements
  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
  }, []);

  // Focus DOM element when focus position changes
  useEffect(() => {
    if (!isKeyboardNavigating) return;

    let element: HTMLElement | null = null;

    if (focusPosition.isUnrankedPool) {
      element = getItemRef("unranked", focusPosition.itemIndex);
    } else if (focusPosition.tierId) {
      if (focusPosition.itemIndex >= 0) {
        element = getItemRef(focusPosition.tierId, focusPosition.itemIndex);
      } else {
        element = getTierRef(focusPosition.tierId);
      }
    }

    if (element) {
      element.focus();
      setLastFocusedElement(element);
    }
  }, [focusPosition, isKeyboardNavigating, getItemRef, getTierRef]);

  // Context value
  const value = useMemo<TierFocusContextState>(
    () => ({
      focusPosition,
      isKeyboardNavigating,
      lastFocusedElement,
      tiers,
      tierItems,
      unrankedItems,
      announcements,
      setFocusPosition,
      setKeyboardNavigating,
      moveFocusUp,
      moveFocusDown,
      moveFocusLeft,
      moveFocusRight,
      focusTier,
      focusItem,
      focusUnrankedPool,
      clearFocus,
      setTiers,
      setTierItems,
      setUnrankedItems,
      announce,
      clearAnnouncements,
      registerTierRef,
      registerItemRef,
      getTierRef,
      getItemRef,
      getFocusedItem,
      getFocusedTier,
      getTierAtIndex,
      getItemsInTier,
    }),
    [
      focusPosition,
      isKeyboardNavigating,
      lastFocusedElement,
      tiers,
      tierItems,
      unrankedItems,
      announcements,
      setFocusPosition,
      moveFocusUp,
      moveFocusDown,
      moveFocusLeft,
      moveFocusRight,
      focusTier,
      focusItem,
      focusUnrankedPool,
      clearFocus,
      announce,
      clearAnnouncements,
      registerTierRef,
      registerItemRef,
      getTierRef,
      getItemRef,
      getFocusedItem,
      getFocusedTier,
      getTierAtIndex,
      getItemsInTier,
    ]
  );

  return (
    <TierFocusContext.Provider value={value}>
      {children}
    </TierFocusContext.Provider>
  );
}

/**
 * Hook to access tier focus context
 */
export function useTierFocus() {
  const context = useContext(TierFocusContext);
  if (!context) {
    throw new Error("useTierFocus must be used within a TierFocusProvider");
  }
  return context;
}

/**
 * Hook to check if an item is focused
 */
export function useIsTierItemFocused(tierId: string, itemIndex: number): boolean {
  const context = useContext(TierFocusContext);
  if (!context) return false;

  return (
    context.isKeyboardNavigating &&
    context.focusPosition.tierId === tierId &&
    context.focusPosition.itemIndex === itemIndex &&
    !context.focusPosition.isUnrankedPool
  );
}

/**
 * Hook to check if a tier is focused
 */
export function useIsTierFocused(tierId: string): boolean {
  const context = useContext(TierFocusContext);
  if (!context) return false;

  return (
    context.isKeyboardNavigating &&
    context.focusPosition.tierId === tierId &&
    !context.focusPosition.isUnrankedPool
  );
}

export type { TierFocusContextState };
