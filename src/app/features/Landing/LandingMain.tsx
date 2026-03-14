"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Music, Trophy, BookOpen, Grid3X3 } from "lucide-react";
import { FloatingShowcase } from "./FloatingShowcase";
import { NeonArenaTheme } from "./shared";
import { CommandPaletteTrigger } from "@/app/features/CommandPalette";
import { useCommandPaletteStore } from "@/app/features/CommandPalette/useCommandPalette";
import { ContinueRankingBar } from "./sub_LandingLists/ContinueRankingBar";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { SectionHeader } from "./sub_LandingLists/SectionHeader";
import { CATEGORY_CONFIG, type CategoryName } from "@/lib/config/category-config";
import { useFeaturedLists } from "@/hooks/use-top-lists";
import { usePlayList } from "@/hooks/use-play-list";
import { getCategoryColor } from "@/lib/helpers/getColors";

// Minimum number of lists in a category before it's considered "ready"
const MIN_CATEGORY_ITEMS = 5;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Sports: <Trophy className="w-5 h-5" />,
  Music: <Music className="w-5 h-5" />,
  Games: <Gamepad2 className="w-5 h-5" />,
  Stories: <BookOpen className="w-5 h-5" />,
};

export function LandingMain() {
  const { handlePlayList } = usePlayList();

  // Fetch featured lists data (same query as FloatingShowcase, TanStack deduplicates)
  const { data: featuredData } = useFeaturedLists({
    popular_limit: 80,
    trending_limit: 80,
    latest_limit: 80,
    awards_limit: 80,
  });

  // Count lists per category from featured data
  const categoryCounts = useMemo(() => {
    if (!featuredData) return {} as Record<string, number>;

    const allLists = [
      ...(featuredData.popular ?? []),
      ...(featuredData.trending ?? []),
      ...(featuredData.latest ?? []),
      ...(featuredData.awards ?? []),
    ];

    const seen = new Set<string>();
    const counts: Record<string, number> = {};

    for (const list of allLists) {
      if (seen.has(list.id)) continue;
      seen.add(list.id);
      const cat = list.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    }

    return counts;
  }, [featuredData]);

  // Build category cards from config + counts
  const categoryCards = useMemo(() => {
    const categories = Object.keys(CATEGORY_CONFIG) as CategoryName[];
    return categories.map((name) => {
      const count = categoryCounts[name.toLowerCase()] ?? categoryCounts[name] ?? 0;
      const isReady = count >= MIN_CATEGORY_ITEMS;
      const colors = getCategoryColor(name.toLowerCase());
      return { name, count, isReady, colors };
    });
  }, [categoryCounts]);

  return (
    <div className="relative" data-testid="landing-main">
      <NeonArenaTheme
        variant="fullPage"
        as="section"
        data-testid="landing-main-classic"
      >
        {/* Continue Ranking - top-level section for returning users */}
        <ContinueRankingBar />

        {/* GlobalSearchBar - primary search entry point */}
        <div className="max-w-xl mx-auto px-6 pt-6 pb-2 relative z-20">
          <GlobalSearchBar
            placeholder="Search lists, items, collections..."
            showQuickResults={true}
            maxQuickResults={6}
          />
        </div>

        {/* Main content - Hero showcase */}
        <FloatingShowcase />

        {/* Browse by Category Section */}
        <div className="max-w-5xl mx-auto px-6 pb-20 relative z-10">
          <SectionHeader
            icon={Grid3X3}
            title="Browse by Category"
            subtitle="Explore rankings across different topics"
            testIdPrefix="browse-category"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
            {categoryCards.map((cat, index) => (
              <motion.button
                key={cat.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
                className={`
                  relative rounded-xl p-4 text-left transition-all duration-200
                  ${cat.isReady
                    ? "cursor-pointer hover:scale-[1.02] hover:brightness-110"
                    : "cursor-default opacity-50"
                  }
                `}
                style={{
                  background: cat.isReady
                    ? `linear-gradient(135deg, ${cat.colors.primary}15 0%, ${cat.colors.primary}08 100%)`
                    : "rgba(30, 41, 59, 0.3)",
                  border: cat.isReady
                    ? `1px solid ${cat.colors.primary}30`
                    : "1px solid rgba(71, 85, 105, 0.2)",
                }}
                onClick={cat.isReady ? () => {
                  useCommandPaletteStore.getState().openWithQuery(cat.name);
                } : undefined}
                disabled={!cat.isReady}
                data-testid={`category-card-${cat.name.toLowerCase()}`}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: cat.isReady
                      ? `${cat.colors.primary}20`
                      : "rgba(71, 85, 105, 0.2)",
                    border: `1px solid ${cat.isReady ? cat.colors.primary + "30" : "rgba(71, 85, 105, 0.15)"}`,
                  }}
                >
                  <span style={{ color: cat.isReady ? cat.colors.primary : "rgb(100, 116, 139)" }}>
                    {CATEGORY_ICONS[cat.name] || <Grid3X3 className="w-5 h-5" />}
                  </span>
                </div>

                {/* Name + count */}
                <div className="text-sm font-semibold text-white/90 mb-0.5">
                  {cat.name}
                </div>
                <div className="text-xs text-slate-500">
                  {cat.count > 0 ? `${cat.count} rankings` : "No rankings yet"}
                </div>

                {/* Coming soon badge */}
                {!cat.isReady && (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-500 bg-gray-800/40 border border-gray-700/30">
                    Coming soon
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Command Palette Trigger - floating button for quick create */}
        <CommandPaletteTrigger />
      </NeonArenaTheme>
    </div>
  );
}