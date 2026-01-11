"use client";

import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, X, ChevronRight, Users, Sparkles } from "lucide-react";
import type { TasteUniverse, Constellation, Star } from "../types";

interface UniverseComparisonPanelProps {
  ownUniverse: TasteUniverse;
  visitedUniverse: TasteUniverse;
  onClose: () => void;
}

interface ComparisonResult {
  category: string;
  ownItems: Star[];
  visitedItems: Star[];
  sharedItems: Array<{ name: string; ownRank: number; visitedRank: number }>;
  similarityScore: number;
}

/**
 * UniverseComparisonPanel - Compare two taste universes
 * Shows overlapping interests, unique items, and taste similarity
 */
export const UniverseComparisonPanel = memo(function UniverseComparisonPanel({
  ownUniverse,
  visitedUniverse,
  onClose,
}: UniverseComparisonPanelProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Compare universes and calculate similarity
  const comparison = useMemo(() => {
    const results: ComparisonResult[] = [];

    // Get all unique categories
    const allCategories = new Set([
      ...ownUniverse.constellations.map((c) => c.category),
      ...visitedUniverse.constellations.map((c) => c.category),
    ]);

    allCategories.forEach((category) => {
      const ownConst = ownUniverse.constellations.find(
        (c) => c.category === category
      );
      const visitedConst = visitedUniverse.constellations.find(
        (c) => c.category === category
      );

      const ownStars = ownConst?.stars || [];
      const visitedStars = visitedConst?.stars || [];

      // Find shared items (same name, case-insensitive)
      const sharedItems = ownStars
        .filter((own) =>
          visitedStars.some(
            (visited) => visited.name.toLowerCase() === own.name.toLowerCase()
          )
        )
        .map((own) => {
          const visited = visitedStars.find(
            (v) => v.name.toLowerCase() === own.name.toLowerCase()
          )!;
          return {
            name: own.name,
            ownRank: own.rank,
            visitedRank: visited.rank,
          };
        });

      // Calculate similarity score for this category
      const maxItems = Math.max(ownStars.length, visitedStars.length);
      const similarityScore =
        maxItems > 0 ? (sharedItems.length / maxItems) * 100 : 0;

      results.push({
        category,
        ownItems: ownStars,
        visitedItems: visitedStars,
        sharedItems,
        similarityScore,
      });
    });

    return results;
  }, [ownUniverse, visitedUniverse]);

  // Overall similarity score
  const overallSimilarity = useMemo(() => {
    if (comparison.length === 0) return 0;
    return (
      comparison.reduce((sum, cat) => sum + cat.similarityScore, 0) /
      comparison.length
    );
  }, [comparison]);

  // Taste compatibility description
  const compatibilityText = useMemo(() => {
    if (overallSimilarity >= 80) return "Soul Twins!";
    if (overallSimilarity >= 60) return "Great Match";
    if (overallSimilarity >= 40) return "Similar Vibes";
    if (overallSimilarity >= 20) return "Some Overlap";
    return "Different Worlds";
  }, [overallSimilarity]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed right-4 top-20 bottom-4 w-80 z-50"
        data-testid="universe-comparison-panel"
      >
        <div className="h-full bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h2 className="text-white font-semibold">Taste Comparison</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                data-testid="comparison-panel-close-btn"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Overall score */}
            <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Taste Match</span>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-bold text-lg">
                    {overallSimilarity.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallSimilarity}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-center text-purple-300 font-medium mt-2">
                {compatibilityText}
              </p>
            </div>
          </div>

          {/* Category comparisons */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {comparison.map((cat) => (
              <div
                key={cat.category}
                className="bg-white/5 rounded-xl overflow-hidden"
              >
                {/* Category header */}
                <button
                  onClick={() =>
                    setExpandedCategory(
                      expandedCategory === cat.category ? null : cat.category
                    )
                  }
                  className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                  data-testid={`comparison-category-${cat.category}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{cat.category}</span>
                    <span className="text-white/40 text-sm">
                      {cat.sharedItems.length} shared
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        cat.similarityScore >= 50
                          ? "text-green-400"
                          : cat.similarityScore >= 25
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {cat.similarityScore.toFixed(0)}%
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-white/40 transition-transform ${
                        expandedCategory === cat.category ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {expandedCategory === cat.category && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10"
                    >
                      <div className="p-3 space-y-2">
                        {cat.sharedItems.length > 0 ? (
                          <>
                            <p className="text-white/60 text-xs mb-2">
                              Shared Rankings:
                            </p>
                            {cat.sharedItems.map((item) => (
                              <div
                                key={item.name}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-white truncate max-w-[140px]">
                                  {item.name}
                                </span>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-cyan-400">
                                    You: #{item.ownRank}
                                  </span>
                                  <span className="text-white/30">vs</span>
                                  <span className="text-purple-400">
                                    Them: #{item.visitedRank}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <p className="text-white/40 text-sm text-center py-2">
                            No shared items in this category
                          </p>
                        )}

                        <div className="pt-2 border-t border-white/5 mt-2 flex justify-between text-xs text-white/40">
                          <span>You: {cat.ownItems.length} items</span>
                          <span>Them: {cat.visitedItems.length} items</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Users className="w-4 h-4" />
              <span>
                Comparing {ownUniverse.stats.totalStars} vs{" "}
                {visitedUniverse.stats.totalStars} ranked items
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
