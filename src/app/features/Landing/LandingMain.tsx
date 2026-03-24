"use client";

import { motion } from "framer-motion";
import { Grid3X3 } from "lucide-react";
import { useMemo } from "react";

import { CommandPaletteTrigger } from "@/app/features/CommandPalette";
import { useCommandPaletteStore } from "@/app/features/CommandPalette/useCommandPalette";
import { GoatTrophy, GoatMusic, GoatGamepad, GoatBook } from "@/components/visual/GoatIcons";
import { usePlayList } from "@/hooks/use-play-list";
import { useFeaturedLists } from "@/hooks/use-top-lists";
import { DURATION } from '@/lib/animations/motion-presets';
import { CATEGORY_CONFIG, resolveDisplayCategory, type CategoryName } from "@/lib/config/category-config";
import { getCategoryColor } from "@/lib/helpers/getColors";

import { FloatingShowcase } from "./FloatingShowcase";
import { NeonArenaTheme } from "./shared";
import { ContinueRankingBar } from "./sub_LandingLists/ContinueRankingBar";
import { SavedListsSection } from "./sub_LandingLists/SavedListsSection";
import { SectionHeader } from "./sub_LandingLists/SectionHeader";


// Minimum number of lists in a category before it's considered "ready"
const MIN_CATEGORY_ITEMS = 50;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Sports: <GoatTrophy className="w-5 h-5" />,
  Music: <GoatMusic className="w-5 h-5" />,
  Games: <GoatGamepad className="w-5 h-5" />,
  Stories: <GoatBook className="w-5 h-5" />,
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

  // Count lists per canonical category using config-based resolution
  const categoryCounts = useMemo(() => {
    if (!featuredData) return {} as Record<CategoryName, number>;

    const allLists = [
      ...(featuredData.popular ?? []),
      ...(featuredData.trending ?? []),
      ...(featuredData.latest ?? []),
      ...(featuredData.awards ?? []),
    ];

    const seen = new Set<string>();
    const counts = {} as Record<CategoryName, number>;

    for (const list of allLists) {
      if (seen.has(list.id)) continue;
      seen.add(list.id);
      const resolved = resolveDisplayCategory(list.category || "");
      if (resolved) {
        counts[resolved] = (counts[resolved] || 0) + 1;
      }
    }

    return counts;
  }, [featuredData]);

  // Build category cards from config + counts, ready ones first then coming-soon
  const categoryCards = useMemo(() => {
    const categories = Object.keys(CATEGORY_CONFIG) as CategoryName[];
    const cards = categories.map((name) => {
      const count = categoryCounts[name] ?? 0;
      const isReady = count >= MIN_CATEGORY_ITEMS;
      const colors = getCategoryColor(name.toLowerCase());
      // Precompute styles to avoid inline object creation in render loop
      const _cardStyle = {
        background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.primary}08 100%)`,
        border: `1px solid ${colors.primary}30`,
      };
      const _iconBgStyle = {
        background: `${colors.primary}20`,
        border: `1px solid ${colors.primary}30`,
      };
      const _iconColorStyle = { color: colors.primary };
      const _onClick = () => useCommandPaletteStore.getState().openWithQuery(name);
      return { name, count, isReady, colors, _cardStyle, _iconBgStyle, _iconColorStyle, _onClick };
    });
    // Sort: ready categories first, then coming-soon
    return cards.sort((a, b) => (a.isReady === b.isReady ? 0 : a.isReady ? -1 : 1));
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

        {/* Saved/Bookmarked Lists — disabled until bookmarks API is ready */}
        {/* <SavedListsSection /> */}

        {/* Browse by Category Section */}
        <div className="max-w-5xl mx-auto px-6 pb-20 relative z-10">
          <SectionHeader
            icon={Grid3X3}
            title="Browse by Category"
            subtitle="Explore rankings across different topics"
            testIdPrefix="browse-category"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
            {categoryCards.map((cat, index) => {
              const progress = Math.min(
                Math.round((cat.count / MIN_CATEGORY_ITEMS) * 100),
                100
              );

              if (cat.isReady) {
                return (
                  <motion.button
                    key={cat.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: DURATION.normal }}
                    className="relative rounded-card p-4 text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:brightness-110"
                    style={cat._cardStyle}
                    onClick={cat._onClick}
                    data-testid={`category-card-${cat.name.toLowerCase()}`}
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-control flex items-center justify-center mb-3"
                      style={cat._iconBgStyle}
                    >
                      <span style={cat._iconColorStyle}>
                        {CATEGORY_ICONS[cat.name] || (
                          <Grid3X3 className="w-5 h-5" />
                        )}
                      </span>
                    </div>

                    {/* Name + count */}
                    <div className="text-sm font-semibold text-white/90 mb-0.5 font-heading">
                      {cat.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {cat.count} rankings
                    </div>
                  </motion.button>
                );
              }

              // Coming-soon card for categories below threshold
              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: DURATION.normal }}
                  className="relative rounded-card p-4 text-left opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${cat.colors.primary}08 0%, ${cat.colors.primary}04 100%)`,
                    border: `1px dashed ${cat.colors.primary}20`,
                  }}
                  data-testid={`category-card-coming-soon-${cat.name.toLowerCase()}`}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-control flex items-center justify-center mb-3"
                    style={{
                      background: `${cat.colors.primary}10`,
                      border: `1px solid ${cat.colors.primary}15`,
                    }}
                  >
                    <span style={{ color: cat.colors.primary, opacity: 0.6 }}>
                      {CATEGORY_ICONS[cat.name] || (
                        <Grid3X3 className="w-5 h-5" />
                      )}
                    </span>
                  </div>

                  {/* Name + coming soon badge */}
                  <div className="text-sm font-semibold text-white/50 mb-1 font-heading">
                    {cat.name}
                  </div>
                  <div className="text-2xs text-slate-600 font-mono mb-2">
                    Coming soon
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: cat.colors.primary,
                        opacity: 0.4,
                      }}
                    />
                  </div>
                  <div className="text-2xs text-slate-600 font-mono mt-1">
                    {cat.count}/{MIN_CATEGORY_ITEMS} rankings
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Command Palette Trigger - floating button for quick create */}
        <CommandPaletteTrigger />
      </NeonArenaTheme>
    </div>
  );
}