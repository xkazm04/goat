"use client";

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTopLists } from '@/hooks/use-top-lists';
import { useListStore } from '@/stores/use-list-store';
import { TopList } from '@/types/top-lists';
import { getCategoryColor } from '@/lib/helpers/getColors';
import { ListGrid, DefaultEmptyState } from '@/components/ui/list-grid';

interface FeaturedListsSectionProps {
  className?: string;
}

const FeaturedListItem = ({ list, onPlay }: { list: TopList; onPlay: (list: TopList) => void }) => {
  const colors = getCategoryColor(list.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative bg-gray-800/40 border border-gray-700/50 rounded-lg overflow-hidden hover:border-cyan-500/30 transition-all duration-300"
      data-testid={`featured-list-item-${list.id}`}
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
        }}
      />

      <div className="relative p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Category badge + title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="px-2 py-0.5 rounded text-xs font-bold text-white flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                }}
                data-testid={`featured-list-category-${list.id}`}
              >
                {list.category.toUpperCase()}
              </div>
              {list.subcategory && (
                <span className="text-xs text-gray-400" data-testid={`featured-list-subcategory-${list.id}`}>
                  {list.subcategory}
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-white truncate" data-testid={`featured-list-title-${list.id}`}>
              {list.title}
            </h4>
            <p className="text-xs text-gray-500 mt-1" data-testid={`featured-list-meta-${list.id}`}>
              Top {list.size} • {list.time_period?.replace('-', ' ') || 'all time'}
            </p>
          </div>

          {/* Right: Play button */}
          <motion.button
            onClick={() => onPlay(list)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded-lg transition-all shadow-lg shadow-cyan-500/10"
            data-testid={`featured-list-play-btn-${list.id}`}
          >
            <Play className="w-4 h-4 text-cyan-400" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export function FeaturedListsSection({ className }: FeaturedListsSectionProps) {
  const router = useRouter();
  const { setCurrentList } = useListStore();

  // Fetch all lists (future: filter for featured/recommended)
  const {
    data: featuredLists = [],
    isLoading,
    error,
    refetch
  } = useTopLists({ limit: 6 });

  const handlePlayList = (list: TopList) => {
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

  return (
    <section className={`relative py-16 px-6 ${className}`} data-testid="featured-lists-section">
      {/* Background with blueprint grid pattern */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />

      {/* Fine grid lines */}
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

      <div className="max-w-6xl mx-auto relative">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Featured Rankings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Discover popular lists from the community</p>
            </div>
          </div>

          {!isLoading && featuredLists.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              data-testid="featured-lists-view-all-btn"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>View All</span>
            </motion.button>
          )}
        </div>

        {/* Lists Grid using ListGrid component */}
        <ListGrid
          items={featuredLists}
          renderItem={(list) => <FeaturedListItem list={list} onPlay={handlePlayList} />}
          isLoading={isLoading}
          error={error ? new Error('Failed to load featured lists') : null}
          onRetry={refetch}
          emptyState={
            <DefaultEmptyState
              icon={Sparkles}
              title="No Featured Lists Yet"
              description="Be the first to create a list!"
            />
          }
          breakpoints={{ sm: 1, md: 2, lg: 3 }}
          gap={4}
          layout="grid"
          testId="featured-lists-grid"
        />
      </div>
    </section>
  );
}
