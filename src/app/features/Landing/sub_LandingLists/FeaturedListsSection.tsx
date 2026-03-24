"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { useState, useCallback, useMemo, memo } from "react";

import { ELEVATION, GLOW_PRESET } from "@/components/visual/depth";
import { GoatSparkles } from "@/components/visual/GoatIcons";
import { GoatMascot } from "@/components/visual/GoatMascot";
// import { useBookmarks } from "@/hooks/use-bookmarks"; // disabled until API is ready
import { useComposition } from "@/hooks/use-composition";
import { useListThumbnails } from "@/hooks/use-list-thumbnails";
import { usePlayList } from "@/hooks/use-play-list";
import { useFeaturedLists } from "@/hooks/use-top-lists";
import { DURATION } from '@/lib/animations/motion-presets';


import { useTempUser } from "@/hooks/use-temp-user";
import { getCategoryColor } from "@/lib/helpers/getColors";
import { TopList } from "@/types/top-lists";

import { BookmarkButton } from "./BookmarkButton";
import { SearchFilterBar, SearchFilterResult } from "./SearchFilterBar";
import { SectionHeader } from "./SectionHeader";
import { FEATURED_ORBS } from "../shared/NeonArenaBackground";
import { NeonArenaTheme } from "../shared/NeonArenaTheme";


interface FeaturedListsSectionProps {
  className?: string;
}

/**
 * Mosaic Card - Clean card for grid display
 */
interface MosaicCardProps {
  list: TopList;
  index: number;
  imageUrl: string | null;
  isLoading: boolean;
  onPlay: (list: TopList) => void;
  onCustomize: (list: TopList) => void;
  isBookmarked: boolean;
  onToggleBookmark: (listId: string) => void;
}

const MosaicCard = memo(function MosaicCard({
  list,
  index,
  imageUrl,
  isLoading,
  onPlay,
  onCustomize,
  isBookmarked,
  onToggleBookmark,
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
      className="relative aspect-4/3 cursor-pointer overflow-hidden rounded-control group
        focus-ring"
      data-testid={`featured-list-item-${index}`}
      tabIndex={0}
      role="button"
      aria-label={`Play ${list.title}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: DURATION.quick }}
      style={{
        background: '#0e1117',
        boxShadow: isHovered
          ? `${ELEVATION.medium}, ${GLOW_PRESET.goldSubtle}`
          : ELEVATION.low,
        transition: 'box-shadow 0.3s ease',
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

      {/* Hover glow overlay */}
      <motion.div
        className="absolute inset-0 rounded-control pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: DURATION.normal }}
        style={{
          background: `radial-gradient(circle at center, rgba(251, 191, 36, 0.08) 0%, transparent 70%)`,
          boxShadow: isHovered ? `inset 0 0 30px rgba(251, 191, 36, 0.05)` : 'none',
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
          transition={{ duration: DURATION.normal }}
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
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-slate-700/30 to-transparent animate-pulse" />
        </div>
      )}

      {/* Bookmark button - top right */}
      <div className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <BookmarkButton
          isBookmarked={isBookmarked}
          onToggle={() => onToggleBookmark(list.id)}
          size="sm"
        />
      </div>

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
        <p className="text-2xs text-white/40 mt-0.5 capitalize">
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
            transition={{ duration: DURATION.quick }}
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                boxShadow: `${ELEVATION.medium}, ${GLOW_PRESET.goldMedium}`,
              }}
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
  const { tempUserId } = useTempUser();
  // Bookmarks disabled until API is ready
  const isBookmarked = (_id: string) => false;
  const toggleBookmark = (_id: string) => {};

  // Search and filter state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [filteredResults, setFilteredResults] = useState<SearchFilterResult[]>([]);

  // Single consolidated API call for all featured lists
  // Uses same limits as FloatingShowcase so TanStack Query serves both from one cache entry
  const {
    data: featuredData,
    isLoading,
  } = useFeaturedLists({
    popular_limit: 80,
    trending_limit: 80,
    latest_limit: 80,
    awards_limit: 80,
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

  // Batch-fetch thumbnail images (replaces N+1 individual queries)
  const thumbnailIds = useMemo(() => allLists.map(l => l.id), [allLists]);
  const imageMap = useListThumbnails(thumbnailIds);

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
      config={{
        orbs: FEATURED_ORBS,
        showCenterGlow: true,
        glowIntensity: 0.12,
      }}
      data-testid="featured-lists-section"
    >
      <div className="max-w-7xl mx-auto relative">
        {/* Section header */}
        <SectionHeader
          icon={GoatSparkles}
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
          <span className="text-xs text-slate-500 font-mono">
            {displayLists.length} rankings
          </span>
          {isSearchActive && (
            <span className="text-2xs text-slate-500">
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
                  className="aspect-4/3 rounded-control bg-slate-800/30 animate-pulse"
                />
              ))
            ) : displayLists.length > 0 ? (
              displayLists.map((list, index) => (
                <MosaicCard
                  key={list.id}
                  list={list}
                  index={index}
                  imageUrl={imageMap[list.id]?.url ?? null}
                  isLoading={imageMap[list.id]?.loading ?? true}
                  onPlay={handlePlayList}
                  onCustomize={handleCustomize}
                  isBookmarked={isBookmarked(list.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))
            ) : (
              <div className="col-span-full py-16 text-center flex flex-col items-center">
                <GoatMascot variant="waving" size={100} />
                <p className="text-amber-200/70 text-sm font-medium mt-3">No rankings found</p>
                <p className="text-xs text-slate-500 mt-1">
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
