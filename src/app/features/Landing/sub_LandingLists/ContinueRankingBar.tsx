"use client";

import { motion } from "framer-motion";
import { Play, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useMemo } from "react";


import { useListThumbnails } from "@/hooks/use-list-thumbnails";
import { usePlayList } from "@/hooks/use-play-list";
import { toast } from "@/hooks/use-toast";
import { useFeaturedLists } from "@/hooks/use-top-lists";
import { useSessionStore } from "@/stores/session-store";
import { TopList } from "@/types/top-lists";

import { RankingProgressIndicator } from "./RankingProgressIndicator";

interface InProgressList {
  listId: string;
  filled: number;
  total: number;
  percentage: number;
  updatedAt: string;
  list?: TopList;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * ContinueRankingBar - Horizontal scrollable strip showing in-progress lists
 * with progress arcs, thumbnails, and one-click resume.
 */
export const ContinueRankingBar = memo(function ContinueRankingBar() {
  const listSessions = useSessionStore((state) => state.listSessions);
  const router = useRouter();
  const { handlePlayList } = usePlayList();

  // Get featured lists to resolve names/metadata
  const { data: featuredData } = useFeaturedLists({
    popular_limit: 80,
    trending_limit: 80,
    latest_limit: 80,
    awards_limit: 80,
  });

  // Build a lookup map of all known lists
  const listLookup = useMemo(() => {
    if (!featuredData) return new Map<string, TopList>();
    const map = new Map<string, TopList>();
    const sources = [
      featuredData.popular ?? [],
      featuredData.trending ?? [],
      featuredData.latest ?? [],
      featuredData.awards ?? [],
    ];
    sources.forEach(source =>
      source.forEach(list => {
        if (!map.has(list.id)) map.set(list.id, list);
      })
    );
    return map;
  }, [featuredData]);

  // Find in-progress lists (1-99% complete)
  const inProgressLists = useMemo(() => {
    const result: InProgressList[] = [];

    for (const [listId, session] of Object.entries(listSessions)) {
      const filled = session.gridItems.filter((item) => item.matched).length;
      const total = session.listSize;
      if (total <= 0) continue;
      const percentage = Math.round((filled / total) * 100);

      if (percentage >= 1 && percentage < 100) {
        result.push({
          listId,
          filled,
          total,
          percentage,
          updatedAt: session.updatedAt,
          list: listLookup.get(listId),
        });
      }
    }

    // Sort by most recently updated
    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return result;
  }, [listSessions, listLookup]);

  // Batch-fetch thumbnails for in-progress lists
  const thumbnailIds = useMemo(() => inProgressLists.map((l) => l.listId), [inProgressLists]);
  const imageMap = useListThumbnails(thumbnailIds);

  if (inProgressLists.length === 0) return null;

  return (
    <div className="w-full px-4 py-4" data-testid="continue-ranking-bar">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Play className="w-4 h-4 text-brand-hover fill-current" />
          <h2 className="text-sm font-semibold text-white font-heading">Continue Ranking</h2>
          <span className="text-2xs text-slate-500">{inProgressLists.length} in progress</span>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
          {inProgressLists.map((item, index) => (
            <motion.button
              key={item.listId}
              onClick={() => {
                if (item.list) {
                  handlePlayList(item.list);
                } else {
                  // Orphaned session: list was deleted or is no longer accessible
                  toast({
                    title: "List Unavailable",
                    description: "This list may have been deleted. Navigating to your session data.",
                  });
                  router.push(`/goat?list=${item.listId}`);
                }
              }}
              className="shrink-0 snap-center flex items-center gap-3 px-3 py-2.5 rounded-card bg-gray-900/80 border border-gray-700/50 hover:border-brand/30 hover:bg-gray-900 transition-all group min-w-[240px] max-w-[300px]"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 shrink-0 rounded-control overflow-hidden bg-gray-800">
                {imageMap[item.listId]?.url ? (
                  <img
                    src={imageMap[item.listId].url!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 font-bold">
                    {(item.list?.title || "?").substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-white truncate group-hover:text-brand-hover transition-colors">
                  {item.list?.title || `List ${item.listId.substring(0, 8)}`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <RankingProgressIndicator
                    filled={item.filled}
                    total={item.total}
                    size="sm"
                    showText={false}
                  />
                  <span className="text-2xs text-slate-400 tabular-nums font-mono">
                    {item.filled}/{item.total}
                  </span>
                </div>
              </div>

              {/* Time ago */}
              <div className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-2xs text-gray-500">{timeAgo(item.updatedAt)}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
});
