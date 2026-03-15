"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Music, Trophy, BookOpen, Grid3X3 } from "lucide-react";
import { FloatingShowcase } from "./FloatingShowcase";
import { NeonArenaTheme } from "./shared";
import { CommandPaletteTrigger } from "@/app/features/CommandPalette";
import { useCommandPaletteStore } from "@/app/features/CommandPalette/useCommandPalette";
import { ContinueRankingBar } from "./sub_LandingLists/ContinueRankingBar";
import { SectionHeader } from "./sub_LandingLists/SectionHeader";
import { CATEGORY_CONFIG, type CategoryName } from "@/lib/config/category-config";
import { useFeaturedLists } from "@/hooks/use-top-lists";
import { usePlayList } from "@/hooks/use-play-list";
import { getCategoryColor } from "@/lib/helpers/getColors";

// Minimum number of lists in a category before it's considered "ready"
const MIN_CATEGORY_ITEMS = 50;

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

  // Build category cards from config + counts, filtering out underpopulated ones
  const categoryCards = useMemo(() => {
    const categories = Object.keys(CATEGORY_CONFIG) as CategoryName[];
    return categories
      .map((name) => {
        const count = categoryCounts[name.toLowerCase()] ?? categoryCounts[name] ?? 0;
        const isReady = count >= MIN_CATEGORY_ITEMS;
        const colors = getCategoryColor(name.toLowerCase());
        return { name, count, isReady, colors };
      })
      .filter((c) => c.isReady);
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

          {categoryCards.length === 0 ? (
            <div className="mt-6 text-center py-12 text-slate-500 text-sm">
              Categories coming soon
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
              {categoryCards.map((cat, index) => (
                <motion.button
                  key={cat.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                  className="relative rounded-xl p-4 text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:brightness-110"
                  style={{
                    background: `linear-gradient(135deg, ${cat.colors.primary}15 0%, ${cat.colors.primary}08 100%)`,
                    border: `1px solid ${cat.colors.primary}30`,
                  }}
                  onClick={() => {
                    useCommandPaletteStore.getState().openWithQuery(cat.name);
                  }}
                  data-testid={`category-card-${cat.name.toLowerCase()}`}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{
                      background: `${cat.colors.primary}20`,
                      border: `1px solid ${cat.colors.primary}30`,
                    }}
                  >
                    <span style={{ color: cat.colors.primary }}>
                      {CATEGORY_ICONS[cat.name] || <Grid3X3 className="w-5 h-5" />}
                    </span>
                  </div>

                  {/* Name + count */}
                  <div className="text-sm font-semibold text-white/90 mb-0.5">
                    {cat.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {cat.count} rankings
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Command Palette Trigger - floating button for quick create */}
        <CommandPaletteTrigger />
      </NeonArenaTheme>
    </div>
  );
}