"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Star,
  Filter,
  Share2,
  ChevronDown,
  Crown,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  Achievement,
  AchievementCategory,
  AchievementTier,
  AchievementShowcase as ShowcaseType,
  TIER_CONFIG,
  CATEGORY_CONFIG,
} from "@/types/achievement";
import { AchievementCard, AchievementCardCompact } from "./AchievementCard";
import { AchievementShareModal } from "./AchievementShareModal";

interface AchievementShowcaseProps {
  showcase: ShowcaseType;
  isOwner?: boolean;
  onTogglePublic?: () => void;
}

type FilterMode = 'all' | 'unlocked' | 'locked';
type SortMode = 'recent' | 'rarity' | 'points' | 'tier';

const TIER_ORDER: AchievementTier[] = ['diamond', 'platinum', 'gold', 'silver', 'bronze'];

export function AchievementShowcase({
  showcase,
  isOwner = false,
  onTogglePublic,
}: AchievementShowcaseProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterCategory, setFilterCategory] = useState<AchievementCategory | 'all'>('all');
  const [filterTier, setFilterTier] = useState<AchievementTier | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort achievements
  const filteredAchievements = useMemo(() => {
    let result = [...showcase.achievements];

    // Apply filters
    if (filterMode === 'unlocked') {
      result = result.filter(a => a.unlocked);
    } else if (filterMode === 'locked') {
      result = result.filter(a => !a.unlocked);
    }

    if (filterCategory !== 'all') {
      result = result.filter(a => a.category === filterCategory);
    }

    if (filterTier !== 'all') {
      result = result.filter(a => a.tier === filterTier);
    }

    // Apply sorting
    switch (sortMode) {
      case 'recent':
        result.sort((a, b) => {
          if (!a.unlockedAt && !b.unlockedAt) return 0;
          if (!a.unlockedAt) return 1;
          if (!b.unlockedAt) return -1;
          return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
        });
        break;
      case 'rarity':
        result.sort((a, b) => a.rarity - b.rarity);
        break;
      case 'points':
        result.sort((a, b) => b.points - a.points);
        break;
      case 'tier':
        result.sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
        break;
    }

    return result;
  }, [showcase.achievements, filterMode, filterCategory, filterTier, sortMode]);

  // Stats calculations
  const stats = useMemo(() => {
    const unlocked = showcase.achievements.filter(a => a.unlocked);
    const byTier = TIER_ORDER.reduce((acc, tier) => {
      acc[tier] = {
        total: showcase.achievements.filter(a => a.tier === tier).length,
        unlocked: unlocked.filter(a => a.tier === tier).length,
      };
      return acc;
    }, {} as Record<AchievementTier, { total: number; unlocked: number }>);

    return {
      totalUnlocked: unlocked.length,
      totalAchievements: showcase.achievements.length,
      totalPoints: showcase.stats.totalPoints,
      completionPercent: Math.round((unlocked.length / showcase.achievements.length) * 100),
      byTier,
    };
  }, [showcase]);

  const handleShare = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setShareModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(15, 20, 35, 1) 0%, rgba(20, 28, 48, 1) 50%, rgba(15, 20, 35, 1) 100%)`,
        }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: 'rgba(6, 182, 212, 0.1)' }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: 'rgba(139, 92, 246, 0.1)' }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-12">
          {/* User info */}
          <div className="flex items-center gap-6 mb-8">
            {showcase.userAvatar ? (
              <img
                src={showcase.userAvatar}
                alt={showcase.username}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-white/10"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)',
                  color: '#000',
                }}
              >
                {showcase.username.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{showcase.username}</h1>
              <p className="text-gray-400">Achievement Showcase</p>
              {isOwner && (
                <button
                  onClick={onTogglePublic}
                  className={`mt-2 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    showcase.isPublic
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                  }`}
                >
                  {showcase.isPublic ? 'Public' : 'Private'}
                </button>
              )}
            </div>

            <div className="flex-1" />

            {/* Share showcase button */}
            {showcase.shareCode && (
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
                }}
              >
                <Share2 className="w-4 h-4" />
                Share Showcase
              </button>
            )}
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total unlocked */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400">Achievements</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.totalUnlocked}
                <span className="text-gray-500 text-lg">/{stats.totalAchievements}</span>
              </p>
            </div>

            {/* Total points */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Star className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-gray-400">Total Points</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalPoints.toLocaleString()}</p>
            </div>

            {/* Completion */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-400">Completion</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.completionPercent}%</p>
            </div>

            {/* Rarest */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                <span className="text-sm text-gray-400">Rarest</span>
              </div>
              <p className="text-sm font-medium text-white truncate">
                {showcase.stats.rarest?.title || 'None yet'}
              </p>
            </div>
          </div>

          {/* Tier progress */}
          <div className="mt-6 p-4 rounded-xl" style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}>
            <p className="text-sm text-gray-400 mb-3">Tier Progress</p>
            <div className="flex items-center gap-6">
              {TIER_ORDER.map((tier) => {
                const tierConfig = TIER_CONFIG[tier];
                const tierStats = stats.byTier[tier];
                const percent = tierStats.total > 0
                  ? Math.round((tierStats.unlocked / tierStats.total) * 100)
                  : 0;

                return (
                  <div key={tier} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: tierConfig.gradient }}
                    >
                      <span className="text-xs font-bold" style={{
                        color: tier === 'gold' || tier === 'bronze' ? '#000' : '#fff'
                      }}>
                        {tierStats.unlocked}
                      </span>
                    </div>
                    <div className="text-xs">
                      <p className="text-gray-400">{tierConfig.label}</p>
                      <p className="text-gray-600">{tierStats.unlocked}/{tierStats.total}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
              showFilters ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Quick filters */}
          <div className="flex items-center gap-2">
            {(['all', 'unlocked', 'locked'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterMode === mode
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Sort */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-3 py-2 rounded-xl bg-white/5 text-gray-300 border border-white/10 text-sm"
          >
            <option value="recent">Most Recent</option>
            <option value="rarity">Rarity</option>
            <option value="points">Points</option>
            <option value="tier">Tier</option>
          </select>
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div
                className="p-4 rounded-xl grid grid-cols-2 gap-4"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Category filter */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterCategory('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterCategory === 'all'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    {(Object.keys(CATEGORY_CONFIG) as AchievementCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          filterCategory === cat
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {CATEGORY_CONFIG[cat].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tier filter */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Tier</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterTier('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterTier === 'all'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    {TIER_ORDER.map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setFilterTier(tier)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          filterTier === tier
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                        style={{
                          background: filterTier === tier ? `${TIER_CONFIG[tier].color}20` : undefined,
                          borderColor: filterTier === tier ? TIER_CONFIG[tier].borderColor : undefined,
                        }}
                      >
                        {TIER_CONFIG[tier].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">
          Showing {filteredAchievements.length} of {showcase.achievements.length} achievements
        </p>

        {/* Achievement grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAchievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.03 }}
              >
                {achievement.unlocked ? (
                  <AchievementCard
                    achievement={achievement}
                    config={{
                      style: 'default',
                      showUsername: false,
                      showProgress: true,
                      showRarity: true,
                      showDate: true,
                      animated: false,
                    }}
                    onShare={() => handleShare(achievement)}
                    className="h-full"
                  />
                ) : (
                  <LockedAchievementCard achievement={achievement} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredAchievements.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No achievements found</p>
            <p className="text-gray-600 text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Share modal */}
      {selectedAchievement && (
        <AchievementShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedAchievement(null);
          }}
          achievement={selectedAchievement}
          username={showcase.username}
          userAvatar={showcase.userAvatar}
        />
      )}
    </div>
  );
}

// Locked achievement card
function LockedAchievementCard({ achievement }: { achievement: Achievement }) {
  const tierConfig = TIER_CONFIG[achievement.tier];

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 h-full"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Locked overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-gray-950/50 flex items-center justify-center z-10">
        <div className="text-center">
          <Lock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Locked</p>
        </div>
      </div>

      {/* Blurred content */}
      <div className="opacity-30">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center"
            style={{ background: tierConfig.gradient }}
          >
            <Trophy className="w-8 h-8 text-white/50" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{achievement.title}</h3>
            <p className="text-sm text-gray-500">{achievement.description}</p>
          </div>
        </div>

        {/* Progress hint */}
        {achievement.progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="text-gray-600">
                {achievement.progress.current}/{achievement.progress.target}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-gray-800">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(achievement.progress.current / achievement.progress.target) * 100}%`,
                  background: tierConfig.gradient,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
