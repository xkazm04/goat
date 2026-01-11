"use client";

import { Suspense, useMemo } from "react";
import { TasteUniverse, type UserList } from "@/app/features/TasteUniverse";
import { showcaseData } from "@/lib/constants/showCaseExamples";

// Loading fallback for the 3D universe
function UniverseLoading() {
  return (
    <div
      className="w-full h-screen flex items-center justify-center bg-[#030712]"
      data-testid="universe-loading"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-24 h-24">
          {/* Outer orbit ring */}
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-[spin_8s_linear_infinite]" />
          {/* Middle orbit ring */}
          <div className="absolute inset-2 rounded-full border-2 border-cyan-500/30 animate-[spin_5s_linear_infinite_reverse]" />
          {/* Inner spinning ring */}
          <div className="absolute inset-4 rounded-full border-2 border-transparent border-t-cyan-500 border-r-purple-500 animate-spin" />
          {/* Core pulse */}
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 animate-pulse" />
        </div>
        <div className="text-center">
          <h2 className="text-white text-lg font-semibold mb-1">
            Entering Taste Universe
          </h2>
          <p className="text-white/60 text-sm">
            Generating constellations from your rankings...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UniversePage() {
  // Convert showcase data to UserList format for the TasteUniverse
  const userLists: UserList[] = useMemo(() => {
    // Group showcase items by category and create sample lists
    const categorizedItems = showcaseData.reduce(
      (acc, item) => {
        const category = item.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          id: `item-${item.id}`,
          name: item.title,
          rank: acc[category].length + 1,
          imageUrl: undefined,
          metadata: {
            subcategory: item.subcategory,
            author: item.author,
            comment: item.comment,
          },
        });
        return acc;
      },
      {} as Record<
        string,
        Array<{
          id: string;
          name: string;
          rank: number;
          imageUrl?: string;
          metadata?: Record<string, unknown>;
        }>
      >
    );

    // Create lists from categories
    return Object.entries(categorizedItems).map(([category, items]) => ({
      id: `list-${category.toLowerCase()}`,
      name: `Top ${category}`,
      category,
      items,
      authorId: "system",
      authorName: "G.O.A.T.",
    }));
  }, []);

  const handleRankingChange = (listId: string, newOrder: string[]) => {
    console.log("Ranking changed:", listId, newOrder);
    // TODO: Persist ranking change to backend
  };

  const handleVisitUniverse = (userId: string) => {
    // Navigate to user's universe
    window.location.href = `/universe/${userId}`;
  };

  return (
    <div className="relative w-full h-screen" data-testid="universe-page">
      <Suspense fallback={<UniverseLoading />}>
        <TasteUniverse
          userLists={userLists}
          enableSpatialRanking
          enableAR
          enableSocial
          onRankingChange={handleRankingChange}
          onVisitUniverse={handleVisitUniverse}
        />
      </Suspense>
    </div>
  );
}
