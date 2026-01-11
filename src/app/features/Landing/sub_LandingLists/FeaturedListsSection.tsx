"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Clock, Trophy, Medal, RefreshCw, AlertCircle } from "lucide-react";
import { useFeaturedLists } from "@/hooks/use-top-lists";
import { useComposition } from "@/hooks/use-composition";
import { usePlayList } from "@/hooks/use-play-list";
import { TopList } from "@/types/top-lists";
import { ListCard } from "./ListCard";
import { SearchFilterBar, SearchFilterResult } from "./SearchFilterBar";
import { listContainerVariants, listItemVariants } from "../shared/animations";
import { NeonArenaTheme } from "../shared/NeonArenaTheme";
import { ShimmerSkeleton, ShimmerAccentColor } from "@/components/ui/shimmer-skeleton";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SectionHeader } from "./SectionHeader";

interface FeaturedListsSectionProps {
  className?: string;
}

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredResults.slice(0, 12).map((result, index) => (
                    <motion.div
                      key={result.list.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ListCard
                        list={result.list}
                        variant="featured"
                        onPlay={handlePlayList}
                        onUseAsTemplate={handleUseAsTemplate}
                        showTemplateButton={result.list.type !== "award"}
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

              {/* Tab Content */}
              <motion.div
                key={activeTabId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 gap-6 max-w-4xl mx-auto"
              >
                {isCurrentLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <ShimmerSkeleton
                      key={i}
                      size="lg"
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
                      <ListCard
                        list={list}
                        variant="featured"
                        onPlay={handlePlayList}
                        onUseAsTemplate={handleUseAsTemplate}
                        showTemplateButton={list.type !== 'award'}
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
