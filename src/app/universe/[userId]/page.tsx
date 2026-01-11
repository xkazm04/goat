"use client";

import { Suspense, useMemo, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TasteUniverse, type UserList } from "@/app/features/TasteUniverse";
import { motion } from "framer-motion";
import { Home, AlertCircle } from "lucide-react";

// Loading fallback for the 3D universe
function UniverseLoading() {
  return (
    <div
      className="w-full h-screen flex items-center justify-center bg-[#030712]"
      data-testid="universe-user-loading"
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
            Traveling to Universe
          </h2>
          <p className="text-white/60 text-sm">Fetching taste constellations...</p>
        </div>
      </div>
    </div>
  );
}

// Error state when universe not found
function UniverseNotFound({ userId }: { userId: string }) {
  const router = useRouter();

  return (
    <div
      className="w-full h-screen flex items-center justify-center bg-[#030712]"
      data-testid="universe-not-found"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 max-w-md text-center p-8"
      >
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Universe Not Found</h1>
          <p className="text-white/60">
            The universe for user &ldquo;{userId}&rdquo; doesn&apos;t exist or is private.
          </p>
        </div>
        <button
          onClick={() => router.push("/universe")}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
          data-testid="universe-not-found-home-btn"
        >
          <Home className="w-4 h-4" />
          <span>Explore Your Universe</span>
        </button>
      </motion.div>
    </div>
  );
}

export default function UserUniversePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitedUserName, setVisitedUserName] = useState<string>("Unknown User");

  // Fetch user's lists
  useEffect(() => {
    async function fetchUserUniverse() {
      setIsLoading(true);
      setError(null);

      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/users/${userId}/lists`);
        // if (!response.ok) throw new Error("Universe not found");
        // const data = await response.json();
        // setUserLists(data.lists);
        // setVisitedUserName(data.userName);

        // For now, simulate fetching with mock data
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Mock: If userId contains "demo", show demo data
        if (userId.includes("demo") || userId === "system") {
          setVisitedUserName("Demo User");
          setUserLists([
            {
              id: "demo-list-1",
              name: "Favorite Movies",
              category: "Stories",
              items: [
                { id: "m1", name: "The Shawshank Redemption", rank: 1 },
                { id: "m2", name: "The Godfather", rank: 2 },
                { id: "m3", name: "The Dark Knight", rank: 3 },
                { id: "m4", name: "Pulp Fiction", rank: 4 },
                { id: "m5", name: "Fight Club", rank: 5 },
              ],
              authorId: userId,
              authorName: "Demo User",
            },
            {
              id: "demo-list-2",
              name: "Top Games",
              category: "Games",
              items: [
                { id: "g1", name: "The Witcher 3", rank: 1 },
                { id: "g2", name: "Red Dead Redemption 2", rank: 2 },
                { id: "g3", name: "Elden Ring", rank: 3 },
                { id: "g4", name: "Breath of the Wild", rank: 4 },
              ],
              authorId: userId,
              authorName: "Demo User",
            },
          ]);
        } else {
          // Simulate not found for other user IDs
          throw new Error("Universe not found");
        }
      } catch {
        setError("Universe not found or is private");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserUniverse();
  }, [userId]);

  const handleRankingChange = (listId: string, newOrder: string[]) => {
    console.log("Ranking change (viewing mode - disabled):", listId, newOrder);
    // Rankings are view-only when visiting other universes
  };

  const handleVisitUniverse = (targetUserId: string) => {
    router.push(`/universe/${targetUserId}`);
  };

  if (isLoading) {
    return <UniverseLoading />;
  }

  if (error || userLists.length === 0) {
    return <UniverseNotFound userId={userId} />;
  }

  return (
    <div className="relative w-full h-screen" data-testid="universe-user-page">
      <Suspense fallback={<UniverseLoading />}>
        <TasteUniverse
          userLists={userLists}
          userId={undefined} // Not the current user
          visitUserId={userId}
          enableSpatialRanking={false} // Can't rank in other users' universes
          enableAR
          enableSocial
          onRankingChange={handleRankingChange}
          onVisitUniverse={handleVisitUniverse}
        />
      </Suspense>

      {/* Visiting indicator overlay */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        data-testid="visiting-indicator"
      >
        <div className="bg-purple-500/20 backdrop-blur-xl rounded-full px-6 py-2 border border-purple-500/30">
          <p className="text-white text-sm">
            Visiting{" "}
            <span className="text-purple-300 font-semibold">{visitedUserName}</span>
            &apos;s Taste Universe
          </p>
        </div>
      </motion.div>
    </div>
  );
}
