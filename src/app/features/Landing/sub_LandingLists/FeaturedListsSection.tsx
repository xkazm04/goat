"use client";

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Clock, Trophy, Medal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTopLists } from '@/hooks/use-top-lists';
import { useListStore } from '@/stores/use-list-store';
import { TopList } from '@/types/top-lists';
import { FeatureListItem } from './FeatureListItem';

interface FeaturedListsSectionProps {
  className?: string;
}

export function FeaturedListsSection({ className }: FeaturedListsSectionProps) {
  const router = useRouter();
  const { setCurrentList } = useListStore();

  // Fetch lists for each column
  const { data: popularLists = [], isLoading: loadingPopular } = useTopLists({ limit: 10, sort: 'popular' });
  const { data: trendingLists = [], isLoading: loadingTrending } = useTopLists({ limit: 10, sort: 'trending' });
  const { data: latestLists = [], isLoading: loadingLatest } = useTopLists({ limit: 10, sort: 'latest' });
  const { data: awardLists = [], isLoading: loadingAwards } = useTopLists({ limit: 10, type: 'award' });

  const handlePlayList = (list: TopList) => {
    if (list.type === 'award') {
      router.push(`/award?id=${list.id}`);
      return;
    }

    setCurrentList({
      id: list.id,
      title: list.title,
      category: list.category,
      subcategory: list.subcategory,
      user_id: list.user_id || '',
      predefined: list.predefined,
      size: list.size,
      time_period: list.time_period,
      created_at: list.created_at
    });
    router.push(`/match-test?list=${list.id}`);
  };

  const renderColumn = (title: string, icon: any, lists: TopList[], isLoading: boolean, delay: number) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-cyan-500/10 rounded-md border border-cyan-500/20">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          // Skeleton loading
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-800/40 rounded-lg animate-pulse" />
          ))
        ) : lists.length > 0 ? (
          lists.map((list) => (
            <FeatureListItem key={list.id} list={list} onPlay={handlePlayList} />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm bg-gray-800/20 rounded-lg border border-gray-800">
            No lists found
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <section className={`relative py-16 px-6 ${className}`} data-testid="featured-lists-section">
      {/* Background with blueprint grid pattern */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
      <div
        className="absolute inset-0 -z-10 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-7xl mx-auto relative">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Featured Rankings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Discover popular lists from the community</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {renderColumn("Most Popular", <Trophy className="w-4 h-4 text-yellow-400" />, popularLists, loadingPopular, 0)}
          {renderColumn("Trending Now", <TrendingUp className="w-4 h-4 text-cyan-400" />, trendingLists, loadingTrending, 0.1)}
          {renderColumn("Latest Added", <Clock className="w-4 h-4 text-purple-400" />, latestLists, loadingLatest, 0.2)}
          {renderColumn("Latest Awards", <Medal className="w-4 h-4 text-orange-400" />, awardLists, loadingAwards, 0.3)}
        </div>
      </div>
    </section>
  );
}
