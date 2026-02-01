"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Play } from "lucide-react";
import { useFeaturedLists } from "@/hooks/use-top-lists";
import { useComposition } from "@/hooks/use-composition";
import { usePlayList } from "@/hooks/use-play-list";
import { TopList } from "@/types/top-lists";
import { SearchFilterBar, SearchFilterResult } from "./SearchFilterBar";
import { NeonArenaTheme } from "../shared/NeonArenaTheme";
import { SectionHeader } from "./SectionHeader";
import { getCategoryColor } from "@/lib/helpers/getColors";
import { useQueries } from "@tanstack/react-query";
import { goatApi } from "@/lib/api";

interface FeaturedListsSectionProps {
  className?: string;
}

/**
 * Mosaic Card - Clean card for grid display
 */
interface MosaicCardProps {
  list: TopList;
  imageUrl: string | null;
  isLoading: boolean;
  onPlay: (list: TopList) => void;
  onCustomize: (list: TopList) => void;
}

const MosaicCard = memo(function MosaicCard({
  list,
  imageUrl,
  isLoading,
  onPlay,
  onCustomize,
}: MosaicCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = useMemo(() => getCategoryColor(list.category), [list.category]);

  const handleClick = useCallback(() => {
    onPlay(list);
  }, [onPlay, list]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onCustomize(list);
  }, [onCustomize, list]);

  return (
    <motion.div
      className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-md group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      style={{
        background: '#0e1117',
        boxShadow: isHovered
          ? `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${colors.primary}30`
          : '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      {/* Category accent - left border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] z-20 transition-all duration-300"
        style={{
          background: colors.primary,
          boxShadow: isHovered ? `0 0 12px ${colors.primary}50` : 'none',
        }}
      />

      {/* Image */}
      {imageUrl && !isLoading && (
        <motion.img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: isHovered ? 'scale(1.03)' : 'scale(1)' }}
          loading="lazy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Placeholder for no image */}
      {!imageUrl && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-3xl font-bold opacity-[0.03]"
            style={{ color: colors.primary }}
          >
            {list.category.substring(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* Loading shimmer */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-800/60">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/30 to-transparent animate-pulse" />
        </div>
      )}

      {/* Bottom info bar - always visible */}
      <div
        className="absolute bottom-0 left-0 right-0 p-2.5 transition-all duration-200"
        style={{
          background: isHovered
            ? 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.9) 100%)'
            : 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
        }}
      >
        <p className="text-xs font-medium text-white/95 leading-snug line-clamp-2">
          {list.title}
        </p>
        <p className="text-[10px] text-white/40 mt-0.5 capitalize">
          {list.category}
        </p>
      </div>

      {/* Hover play button overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/40"
            >
              <Play className="w-6 h-6 text-white fill-current ml-0.5" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export function FeaturedListsSection({ className }: FeaturedListsSectionProps) {
  const { openWithSourceList } = useComposition();
  const { handlePlayList } = usePlayList();

  // Search and filter state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [filteredResults, setFilteredResults] = useState<SearchFilterResult[]>([]);

  // Single consolidated API call for all featured lists
  const {
    data: featuredData,
    isLoading,
  } = useFeaturedLists({
    popular_limit: 50,
    trending_limit: 50,
    latest_limit: 50,
    awards_limit: 50,
  });

  // Combine and dedupe all lists
  const allLists = useMemo(() => {
    if (!featuredData) return [];

    const combined = [
      ...(featuredData.popular ?? []),
      ...(featuredData.trending ?? []),
      ...(featuredData.latest ?? []),
      ...(featuredData.awards ?? []),
    ];

    const seen = new Set<string>();
    return combined.filter(list => {
      if (seen.has(list.id)) return false;
      seen.add(list.id);
      return true;
    }).slice(0, 60);
  }, [featuredData]);

  // Fetch images for grid cards
  const imageQueries = useQueries({
    queries: allLists.slice(0, 60).map(list => ({
      queryKey: ['list-image', list.id],
      queryFn: async () => {
        const data = await goatApi.lists.get(list.id);
        const firstWithImage = data?.items?.find(item => item.image_url);
        return { id: list.id, url: firstWithImage?.image_url || null };
      },
      staleTime: 1000 * 60 * 15,
    })),
  });

  const imageMap = useMemo(() => {
    const map: Record<string, { url: string | null; loading: boolean }> = {};
    imageQueries.forEach((query, index) => {
      const listId = allLists[index]?.id;
      if (listId) {
        map[listId] = {
          url: query.data?.url ?? null,
          loading: query.isLoading,
        };
      }
    });
    return map;
  }, [imageQueries, allLists]);

  // Handlers for search/filter
  const handleFilteredResults = useCallback((results: SearchFilterResult[]) => {
    setFilteredResults(results);
  }, []);

  const handleSearchActive = useCallback((active: boolean) => {
    setIsSearchActive(active);
  }, []);

  const handleCustomize = useCallback((list: TopList) => {
    openWithSourceList(list);
  }, [openWithSourceList]);

  // Display lists - either filtered or all
  const displayLists = isSearchActive
    ? filteredResults.map(r => r.list)
    : allLists;

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
          lists={allLists}
          onFilteredResults={handleFilteredResults}
          onSearchActive={handleSearchActive}
          className="mb-8"
        />

        {/* Results count */}
        <div className="mb-6 flex items-center justify-between max-w-6xl mx-auto">
          <span className="text-xs text-slate-500">
            {displayLists.length} rankings
          </span>
          {isSearchActive && (
            <span className="text-[10px] text-slate-500">
              Showing search results
            </span>
          )}
        </div>

        {/* Mosaic Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-w-6xl mx-auto">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="aspect-[4/3] rounded-md bg-slate-800/30 animate-pulse"
                />
              ))
            ) : displayLists.length > 0 ? (
              displayLists.map((list) => (
                <MosaicCard
                  key={list.id}
                  list={list}
                  imageUrl={imageMap[list.id]?.url ?? null}
                  isLoading={imageMap[list.id]?.loading ?? true}
                  onPlay={handlePlayList}
                  onCustomize={handleCustomize}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <p className="text-slate-500 text-sm mb-3">No rankings found</p>
                <p className="text-xs text-slate-600">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </NeonArenaTheme>
  );
}
