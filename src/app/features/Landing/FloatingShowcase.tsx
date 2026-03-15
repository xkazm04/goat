"use client";

import { memo, useMemo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Play, Plus } from "lucide-react";
import { ShowcaseHeader } from "./ShowcaseHeader";
import ShowcaseDecor from "@/components/app/decorations/ShowcaseDecor";
import { useAnimationPause } from "@/hooks/use-animation-pause";
import { useFeaturedLists } from "@/hooks/use-top-lists";
import { useComposition } from "@/hooks/use-composition";
import { usePlayList } from "@/hooks/use-play-list";
import { TopList } from "@/types/top-lists";
import { getCategoryColor } from "@/lib/helpers/getColors";
import { gradients } from "./shared/gradients";
import { useListThumbnails } from "@/hooks/use-list-thumbnails";

/**
 * FloatingShowcase - Hero section with category tables
 *
 * Design: Three category tables side by side showing lists
 */

const CATEGORIES = ['sports', 'movies', 'games'] as const;

interface TableRowProps {
    list: TopList;
    imageUrl: string | null;
    isLoading: boolean;
    onPlay: (list: TopList) => void;
    onCustomize: (list: TopList) => void;
    colors: ReturnType<typeof getCategoryColor>;
}

const TableRow = memo(function TableRow({
    list,
    imageUrl,
    isLoading,
    onPlay,
    onCustomize,
    colors,
}: TableRowProps) {
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = useCallback(() => {
        onPlay(list);
    }, [onPlay, list]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        onCustomize(list);
    }, [onCustomize, list]);

    const sizeLabel = `Top ${list.size}`;

    return (
        <motion.div
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            style={{
                background: isHovered ? `${colors.primary}10` : 'transparent',
            }}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.15 }}
        >
            {/* Winner Image */}
            <div
                className="w-8 h-8 shrink-0 rounded overflow-hidden relative"
                style={{ background: '#0c0c12' }}
            >
                {imageUrl && !isLoading ? (
                    <img
                        src={imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : isLoading ? (
                    <div className="w-full h-full bg-slate-800 animate-pulse" />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center text-[10px] font-bold opacity-30"
                        style={{ color: colors.primary }}
                    >
                        {list.title.substring(0, 2).toUpperCase()}
                    </div>
                )}
                {isHovered && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    </div>
                )}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <p
                    className="text-[11px] font-medium leading-tight truncate transition-colors"
                    style={{ color: isHovered ? colors.accent : '#e2e8f0' }}
                >
                    {list.title}
                </p>
            </div>

            {/* Type badge */}
            <span
                className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{
                    background: `${colors.primary}20`,
                    color: colors.primary,
                }}
            >
                {sizeLabel}
            </span>
        </motion.div>
    );
});

interface CategoryTableProps {
    category: string;
    lists: TopList[];
    imageMap: Record<string, { url: string | null; loading: boolean }>;
    onPlay: (list: TopList) => void;
    onCustomize: (list: TopList) => void;
    isLoading: boolean;
}

const CategoryTable = memo(function CategoryTable({
    category,
    lists,
    imageMap,
    onPlay,
    onCustomize,
    isLoading,
}: CategoryTableProps) {
    const colors = useMemo(() => getCategoryColor(category), [category]);

    return (
        <div
            className="flex-1 min-w-0 rounded-lg overflow-hidden backdrop-blur-md"
            style={{
                background: gradients.cardSurface,
                border: `1px solid ${colors.primary}20`,
            }}
        >
            {/* Thin category header */}
            <div
                className="px-3 py-1.5 flex items-center justify-between"
                style={{
                    background: `linear-gradient(90deg, ${colors.primary}15 0%, transparent 100%)`,
                    borderBottom: `1px solid ${colors.primary}30`,
                }}
            >
                <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: colors.primary }}
                >
                    {category}
                </span>
                <span className="text-[9px] text-slate-500">
                    {lists.length} lists
                </span>
            </div>

            {/* Table rows */}
            <div className="max-h-[320px] overflow-y-auto scrollbar-hide">
                {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                            <div className="w-8 h-8 bg-slate-800/50 rounded animate-pulse" />
                            <div className="flex-1 h-3 bg-slate-800/50 rounded animate-pulse" />
                            <div className="w-12 h-4 bg-slate-800/50 rounded animate-pulse" />
                        </div>
                    ))
                ) : lists.length > 0 ? (
                    lists.map((list) => (
                        <TableRow
                            key={list.id}
                            list={list}
                            imageUrl={imageMap[list.id]?.url ?? null}
                            isLoading={imageMap[list.id]?.loading ?? true}
                            onPlay={onPlay}
                            onCustomize={onCustomize}
                            colors={colors}
                        />
                    ))
                ) : (
                    <div className="px-3 py-8 text-center">
                        <p className="text-xs text-slate-600">No lists in this category</p>
                    </div>
                )}
            </div>
        </div>
    );
});

export const FloatingShowcase = memo(function FloatingShowcase() {
    const {
        ref: animationRef,
        shouldAnimate,
        animationClass,
    } = useAnimationPause({ rootMargin: "200px" });

    const { openWithSourceList, openComposition } = useComposition();
    const { handlePlayList } = usePlayList();

    const { data: featuredData, isLoading } = useFeaturedLists({
        popular_limit: 80,
        trending_limit: 80,
        latest_limit: 80,
        awards_limit: 80,
    });

    // Combine and dedupe all lists
    const allLists = useMemo(() => {
        if (!featuredData) return [];

        const seen = new Set<string>();
        const combined: TopList[] = [];

        const sources = [
            featuredData.popular ?? [],
            featuredData.trending ?? [],
            featuredData.latest ?? [],
            featuredData.awards ?? [],
        ];

        sources.forEach(source => {
            source.forEach(list => {
                if (!seen.has(list.id)) {
                    seen.add(list.id);
                    combined.push(list);
                }
            });
        });

        return combined;
    }, [featuredData]);

    // Group by category
    const categoryLists = useMemo(() => {
        const groups: Record<string, TopList[]> = {
            sports: [],
            movies: [],
            games: [],
        };

        allLists.forEach(list => {
            const cat = list.category.toLowerCase();
            if (cat.includes('sport')) {
                groups.sports.push(list);
            } else if (cat.includes('movie') || cat.includes('film')) {
                groups.movies.push(list);
            } else if (cat.includes('game')) {
                groups.games.push(list);
            }
        });

        return groups;
    }, [allLists]);

    // Batch-fetch thumbnail images (replaces N+1 individual queries)
    const thumbnailIds = useMemo(() => {
        return [
            ...categoryLists.sports.slice(0, 30),
            ...categoryLists.movies.slice(0, 30),
            ...categoryLists.games.slice(0, 30),
        ].map(l => l.id);
    }, [categoryLists]);

    const imageMap = useListThumbnails(thumbnailIds);

    const handleCustomize = useCallback((list: TopList) => {
        openWithSourceList(list);
    }, [openWithSourceList]);

    return (
        <div
            ref={animationRef}
            className={`relative w-full min-h-screen ${animationClass}`}
            style={{ perspective: "1500px" }}
            data-testid="floating-showcase"
        >
            {/* Background decor - lowest z-index */}
            <div className="absolute inset-0 z-0">
                <ShowcaseDecor shouldAnimate={shouldAnimate} />
            </div>

            {/* Noise texture overlay */}
            <div
                className="absolute inset-0 z-1 pointer-events-none noise-texture"
                aria-hidden="true"
            />

            {/* Header */}
            <div className="relative z-10">
                <ShowcaseHeader />
            </div>

            {/* Category Tables */}
            <div className="relative z-10 px-4 pb-8 pt-4">
                <div className="max-w-6xl mx-auto">
                    {/* Create button */}
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => openComposition()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-hover hover:text-white hover:bg-brand/20 border border-brand/30 rounded-md transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Create New
                        </button>
                    </div>

                    {/* Three tables side by side */}
                    <div className="flex gap-4">
                        {CATEGORIES.map(category => (
                            <CategoryTable
                                key={category}
                                category={category}
                                lists={categoryLists[category]}
                                imageMap={imageMap}
                                onPlay={handlePlayList}
                                onCustomize={handleCustomize}
                                isLoading={isLoading}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});