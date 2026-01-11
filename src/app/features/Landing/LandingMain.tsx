"use client";

import { useState, useCallback, lazy, Suspense, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Layers, Globe } from "lucide-react";
import { FloatingShowcase } from "./FloatingShowcase";
import { LazyCompositionModal } from "./sub_CreateList/LazyCompositionModal";
import { NeonArenaTheme, useCardClickHandler } from "./shared";
import { CommandPaletteTrigger } from "@/app/features/CommandPalette";
import { showcaseData } from "@/lib/constants/showCaseExamples";
import type { UserList } from "@/app/features/TasteUniverse";

// Lazy load the 3D universe components for better initial load performance
const TasteUniverse = lazy(() =>
  import("@/app/features/TasteUniverse").then((mod) => ({ default: mod.TasteUniverse }))
);

// Loading fallback for the 3D universe
function Universe3DLoading() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#030712]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-purple-500 animate-spin" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 animate-pulse" />
        </div>
        <p className="text-white/60 text-sm">Generating Taste Universe...</p>
      </div>
    </div>
  );
}

type ViewMode = "classic" | "universe";

export function LandingMain() {
  const [viewMode, setViewMode] = useState<ViewMode>("classic");
  const handleCardClick = useCardClickHandler();

  // Toggle between view modes
  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "classic" ? "universe" : "classic"));
  }, []);

  // Convert showcase data to UserList format for the TasteUniverse
  const userLists: UserList[] = useMemo(() => {
    // Group showcase items by category and create sample lists
    const categorizedItems = showcaseData.reduce((acc, item, index) => {
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
    }, {} as Record<string, Array<{ id: string; name: string; rank: number; imageUrl?: string; metadata?: Record<string, unknown> }>>);

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

  return (
    <div className="relative" data-testid="landing-main">
      {/* View mode toggle button */}
      <motion.button
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl
          bg-black/40 backdrop-blur-md border border-white/10
          text-white/80 hover:text-white hover:bg-black/60
          transition-colors duration-200 group"
        onClick={toggleViewMode}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        data-testid="view-mode-toggle-btn"
        title={viewMode === "classic" ? "Enter immersive 3D Taste Universe" : "Return to classic view"}
      >
        {viewMode === "classic" ? (
          <>
            <Globe className="w-4 h-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 group-hover:animate-pulse" />
            <span className="text-sm font-medium">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                Enter Taste Universe
              </span>
            </span>
            <Sparkles className="w-3 h-3 text-purple-400 opacity-60" />
          </>
        ) : (
          <>
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium">Classic View</span>
          </>
        )}
      </motion.button>

      {/* View content */}
      <AnimatePresence mode="wait">
        {viewMode === "classic" ? (
          <motion.div
            key="classic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <NeonArenaTheme
              variant="fullPage"
              as="section"
              data-testid="landing-main-classic"
            >
              {/* Main content */}
              <FloatingShowcase />

              {/* Composition Modal - lazy loaded */}
              <LazyCompositionModal />

              {/* Command Palette Trigger - floating button for quick create */}
              <CommandPaletteTrigger />
            </NeonArenaTheme>
          </motion.div>
        ) : (
          <motion.div
            key="universe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 3D Taste Universe - Immersive spatial ranking experience */}
            <Suspense fallback={<Universe3DLoading />}>
              <TasteUniverse
                userLists={userLists}
                enableSpatialRanking
                enableAR
                enableSocial
                onRankingChange={(listId, newOrder) => {
                  console.log("Ranking changed:", listId, newOrder);
                }}
              />
            </Suspense>

            {/* Composition Modal (available in universe mode too) - lazy loaded */}
            <LazyCompositionModal />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}