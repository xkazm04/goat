"use client";

import { useState, useCallback, useEffect } from "react";
import type { TasteUniverse, SocialState } from "../types";

/**
 * Mock function to fetch user universe - replace with real API call
 */
async function fetchUserUniverse(userId: string): Promise<TasteUniverse | null> {
  // This would be replaced with a real API call
  // For now, return null to indicate no universe found
  console.log(`Fetching universe for user: ${userId}`);
  return null;
}

/**
 * Mock function to fetch shared/featured universes
 */
async function fetchSharedUniverses(): Promise<TasteUniverse[]> {
  // This would be replaced with a real API call
  return [];
}

/**
 * Hook for managing social features in the Taste Universe
 */
export function useSocialFeatures(currentUserId?: string) {
  const [socialState, setSocialState] = useState<SocialState>({
    currentUserId: currentUserId || null,
    visitingUserId: null,
    isVisiting: false,
    sharedUniverses: [],
  });

  const [visitedUniverse, setVisitedUniverse] = useState<TasteUniverse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update current user ID when prop changes
  useEffect(() => {
    setSocialState((prev) => ({
      ...prev,
      currentUserId: currentUserId || null,
    }));
  }, [currentUserId]);

  // Load shared universes on mount
  useEffect(() => {
    async function loadSharedUniverses() {
      try {
        const universes = await fetchSharedUniverses();
        setSocialState((prev) => ({
          ...prev,
          sharedUniverses: universes,
        }));
      } catch (err) {
        console.error("Failed to load shared universes:", err);
      }
    }

    loadSharedUniverses();
  }, []);

  // Visit another user's universe
  const visitUniverse = useCallback(async (userId: string) => {
    if (userId === currentUserId) {
      // Can't visit own universe
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const universe = await fetchUserUniverse(userId);

      if (!universe) {
        setError("Universe not found or is private");
        setVisitedUniverse(null);
        setSocialState((prev) => ({
          ...prev,
          visitingUserId: null,
          isVisiting: false,
        }));
        return;
      }

      setVisitedUniverse(universe);
      setSocialState((prev) => ({
        ...prev,
        visitingUserId: userId,
        isVisiting: true,
      }));
    } catch (err) {
      setError("Failed to load universe");
      console.error("Visit universe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  // Return to own universe
  const returnToOwnUniverse = useCallback(() => {
    setVisitedUniverse(null);
    setSocialState((prev) => ({
      ...prev,
      visitingUserId: null,
      isVisiting: false,
    }));
  }, []);

  // Share current universe (make public)
  const shareUniverse = useCallback(async () => {
    if (!currentUserId) {
      setError("Must be logged in to share");
      return false;
    }

    // This would make an API call to set isPublic: true
    console.log("Sharing universe for user:", currentUserId);
    return true;
  }, [currentUserId]);

  // Get shareable link for universe
  const getShareableLink = useCallback((userId: string) => {
    // Generate a shareable URL
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/universe/${userId}`;
  }, []);

  // Compare two universes (find overlapping interests)
  const compareUniverses = useCallback(
    (otherUniverse: TasteUniverse) => {
      if (!visitedUniverse && !otherUniverse) {
        return {
          overlappingCategories: [],
          uniqueToUser: [],
          uniqueToVisited: [],
          similarityScore: 0,
        };
      }

      // This would do actual comparison logic
      // For now, return empty comparison
      return {
        overlappingCategories: [] as string[],
        uniqueToUser: [] as string[],
        uniqueToVisited: [] as string[],
        similarityScore: 0,
      };
    },
    [visitedUniverse]
  );

  return {
    socialState,
    visitedUniverse,
    isLoading,
    error,
    visitUniverse,
    returnToOwnUniverse,
    shareUniverse,
    getShareableLink,
    compareUniverses,
  };
}
