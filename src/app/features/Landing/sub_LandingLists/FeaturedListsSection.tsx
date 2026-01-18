"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Clock, Trophy, Medal, Play, Copy, AlertCircle } from "lucide-react";
import { useFeaturedLists } from "@/hooks/use-top-lists";
import { useComposition } from "@/hooks/use-composition";
import { usePlayList } from "@/hooks/use-play-list";
import { TopList } from "@/types/top-lists";
import { SearchFilterBar, SearchFilterResult } from "./SearchFilterBar";
import { listItemVariants } from "../shared/animations";
import { NeonArenaTheme } from "../shared/NeonArenaTheme";
import { ShimmerSkeleton, ShimmerAccentColor } from "@/components/ui/shimmer-skeleton";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SectionHeader } from "./SectionHeader";
import { getCategoryColor } from "@/lib/helpers/getColors";
import { ListPreviewThumbnail } from "./ListPreviewThumbnail";
import { useQuery } from "@tanstack/react-query";
import { goatApi } from "@/lib/api";
import { topListsKeys } from "@/lib/query-keys/top-lists";

interface FeaturedListsSectionProps {
  className?: string;
}

// Compact List Card for two-column layout
interface CompactListCardProps {
  list: TopList;
  onPlay: (list: TopList) => void;
  onUseAsTemplate?: (list: TopList) => void;
}

const CompactListCard = memo(function CompactListCard({
  list,
  onPlay,
  onUseAsTemplate,
}: CompactListCardProps) {
  const colors = useMemo(() => getCategoryColor(list.category), [list.category]);

  // Fetch list items to get images
  const { data: listData } = useQuery({
    queryKey: topListsKeys.list(list.id, true),
    queryFn: () => goatApi.lists.get(list.id, true),
    staleTime: 5 * 60 * 1000,
    enabled: !!list.id,
    select: (data) => {
      const itemsWithImages = (data.items || [])
        .filter((item: { image_url?: string }) => item.image_url)
        .slice(0, 4);
      return itemsWithImages;
    },
  });

  const itemImages = listData || [];

  const handlePlay = useCallback(() => {
    onPlay(list);
  }, [onPlay, list]);

  const handleTemplateClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUseAsTemplate?.(list);
  }, [onUseAsTemplate, list]);

  return (
    <motion.div
      className="relative group rounded-xl overflow-hidden cursor-pointer"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={handlePlay}
      style={{
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
      }}
      data-testid={`compact-list-item-${list.id}`}
    >
      {/* Gradient border */}
      <div
        className="absolute inset-0 p-[1px] rounded-xl z-0 opacity-40 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary}, ${colors.primary})`,
          backgroundSize: "200% 200%",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
        }}
      />

      <div className="relative p-3">
        {/* Title row - above images */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <h4
            className="text-sm font-bold text-white leading-tight group-hover:text-cyan-300 transition-colors line-clamp-1 flex-1"
            data-testid={`compact-list-title-${list.id}`}
          >
            {list.title}
          </h4>

          {/* Category badge */}
          <span
            className="flex-shrink-0 px-2 py-0.5 text-[9px] rounded-full uppercase tracking-wider font-bold border backdrop-blur-md"
            style={{
              color: colors.primary,
              backgroundColor: `${colors.primary}10`,
              borderColor: `${colors.primary}30`,
            }}
          >
            {list.category}
          </span>
        </div>

        {/* Images row - 4 images at 25% width each */}
        <div className="flex gap-1 mb-3">
          {itemImages.length > 0 ? (
            itemImages.map((item: { id: string; image_url?: string; title?: string }, index: number) => (
              <div
                key={item.id}
                className="w-1/4 aspect-square rounded-lg overflow-hidden relative"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}10)`,
                }}
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title || `Item ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {/* Rank badge */}
                <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-black/70 rounded text-[8px] font-bold text-white">
                  #{index + 1}
                </div>
              </div>
            ))
          ) : (
            // Placeholder images
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-1/4 aspect-square rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}10)`,
                }}
              >
                <Trophy className="w-4 h-4" style={{ color: `${colors.accent}40` }} />
              </div>
            ))
          )}
        </div>

        {/* Bottom row - metadata and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Top {list.size}
            </span>
            <span className="uppercase tracking-wide opacity-80">
              {list.time_period?.replace("-", " ") || "All time"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onUseAsTemplate && list.type !== "award" && (
              <button
                onClick={handleTemplateClick}
                className="p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                style={{
                  background: `${colors.primary}15`,
                  border: `1px solid ${colors.primary}20`,
                }}
                title="Use as Template"
              >
                <Copy className="w-3 h-3 text-cyan-400" />
              </button>
            )}
            <div
              className="p-1.5 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}15)`,
              }}
            >
              <Play className="w-3 h-3 text-white fill-current" />
            </div>
          </div>
        </div>
      </div>

      {/* Shimmer effect on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{
          background: `
            linear-gradient(
              105deg,
              transparent 40%,
              rgba(255, 255, 255, 0.03) 50%,
              transparent 60%
            )
          `,
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
      />
    </motion.div>
  );
});

// Column configuration for cleaner rendering
const COLUMNS: readonly {
  id: string;
  title: string;
  icon: typeof Trophy;
  iconColor: string;
  gradient: string;
  accentColor: ShimmerAccentColor;
}[] = [
  { id: "popular", title: "Most Popular", icon: Trophy, iconColor: "text-amber-400", gradient: "from-amber-500/20 to-orange-500/20", accentColor: "amber" },
  { id: "trending", title: "Trending Now", icon: TrendingUp, iconColor: "text-cyan-400", gradient: "from-cyan-500/20 to-blue-500/20", accentColor: "cyan" },
  { id: "latest", title: "Latest Added", icon: Clock, iconColor: "text-violet-400", gradient: "from-violet-500/20 to-purple-500/20", accentColor: "violet" },
  { id: "awards", title: "Latest Awards", icon: Medal, iconColor: "text-rose-400", gradient: "from-rose-500/20 to-pink-500/20", accentColor: "rose" },
] as const;

export function FeaturedListsSection({ className }: FeaturedListsSectionProps) {
  const { openWithSourceList } = useComposition();
  const { handlePlayList } = usePlayList();
  const prefersReducedMotion = useReducedMotion();

  // Search and filter state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [filteredResults, setFilteredResults] = useState<SearchFilterResult[]>([]);

  // Tab state
  const [activeTabId, setActiveTabId] = useState<string>(COLUMNS[0].id);

  // Single consolidated API call for all featured lists
  const {
    data: featuredData,
    isLoading,
    error,
    refetch,
  } = useFeaturedLists({
    popular_limit: 20, // Increased limit for fuller list
    trending_limit: 20,
    latest_limit: 20,
    awards_limit: 20,
  });

  // Extract lists from consolidated response with defaults
  const popularLists = featuredData?.popular ?? [];
  const trendingLists = featuredData?.trending ?? [];
  const latestLists = featuredData?.latest ?? [];
  const awardLists = featuredData?.awards ?? [];

  // Map tab ID to data
  const getListsForTab = useCallback((tabId: string) => {
    switch (tabId) {
      case "popular": return popularLists;
      case "trending": return trendingLists;
      case "latest": return latestLists;
      case "awards": return awardLists;
      default: return [];
    }
  }, [popularLists, trendingLists, latestLists, awardLists]);

  const currentLists = getListsForTab(activeTabId);
  const currentColumn = COLUMNS.find(c => c.id === activeTabId) || COLUMNS[0];

  // All columns share the same loading/error/refetch state from single request in this implementation
  // ideally this would be per-query but for now it's shared
  const isCurrentLoading = isLoading;
  const isCurrentError = error;

  // Combine all lists for search
  const allListsFlat = useMemo(() => {
    return [...popularLists, ...trendingLists, ...latestLists, ...awardLists];
  }, [popularLists, trendingLists, latestLists, awardLists]);

  // Handlers for search/filter
  const handleFilteredResults = useCallback((results: SearchFilterResult[]) => {
    setFilteredResults(results);
  }, []);

  const handleSearchActive = useCallback((active: boolean) => {
    setIsSearchActive(active);
  }, []);

  const handleUseAsTemplate = useCallback((list: TopList) => {
    openWithSourceList(list);
  }, [openWithSourceList]);

  return (
    <NeonArenaTheme
      variant="section"
      as="section"
      className={`py-20 px-6 ${className}`}
      data-testid="featured-lists-section"
    >
      <div className="max-w-7xl mx-auto relative">
        {/* Section header */}
        <SectionHeader
          icon={Sparkles}
          title="Featured Rankings"
          subtitle="Discover the most popular lists from our community"
          testIdPrefix="featured-lists"
        />

        {/* Search and Filter Bar */}
        <SearchFilterBar
          lists={allListsFlat}
          onFilteredResults={handleFilteredResults}
          onSearchActive={handleSearchActive}
          className="mb-8"
        />

        {/* Filtered Results View (when search is active) */}
        <AnimatePresence mode="wait">
          {isSearchActive ? (
            <motion.div
              key="filtered-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
              data-testid="filtered-results-container"
            >
              {filteredResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                  {filteredResults.slice(0, 15).map((result, index) => (
                    <motion.div
                      key={result.list.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <CompactListCard
                        list={result.list}
                        onPlay={handlePlayList}
                        onUseAsTemplate={handleUseAsTemplate}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  className="p-12 text-center rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(51, 65, 85, 0.2))`,
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                  data-testid="no-results-message"
                >
                  <p className="text-slate-400 text-lg mb-2">No lists found</p>
                  <p className="text-slate-500 text-sm">
                    Try adjusting your search or filters
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="tabs-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Custom Tab Switcher */}
              <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
                {COLUMNS.map((column) => {
                  const isActive = activeTabId === column.id;
                  const Icon = column.icon;
                  return (
                    <button
                      key={column.id}
                      onClick={() => setActiveTabId(column.id)}
                      className={`
                        relative flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300
                        ${isActive ? "text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}
                      `}
                      style={isActive ? {
                        background: `linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))`,
                        boxShadow: `0 4px 20px -5px ${column.iconColor.replace('text-', 'bg-').replace('400', '500')}50`,
                        border: '1px solid rgba(255,255,255,0.1)'
                      } : {}}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? column.iconColor : "text-slate-500"}`} />
                      <span className="font-semibold text-sm">{column.title}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          className={`absolute inset-0 rounded-xl bg-gradient-to-r ${column.gradient} opacity-20`}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content - Three Column Grid */}
              <motion.div
                key={activeTabId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto"
              >
                {isCurrentLoading ? (
                  Array.from({ length: 9 }).map((_, i) => (
                    <ShimmerSkeleton
                      key={i}
                      size="md"
                      accentColor={currentColumn.accentColor}
                      testId={`featured-skeleton-${activeTabId}-${i}`}
                    />
                  ))
                ) : isCurrentError ? (
                  <div className="col-span-full p-12 text-center text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20">
                    <AlertCircle className="w-10 h-10 mx-auto mb-4 opacity-80" />
                    <p className="text-lg font-medium">Failed to load content</p>
                    <button
                      onClick={() => refetch()}
                      className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : currentLists.length > 0 ? (
                  currentLists.map((list) => (
                    <motion.div key={list.id} variants={listItemVariants} layout>
                      <CompactListCard
                        list={list}
                        onPlay={handlePlayList}
                        onUseAsTemplate={handleUseAsTemplate}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center text-slate-500">
                    <p>No lists found in this category.</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NeonArenaTheme>
  );
}
