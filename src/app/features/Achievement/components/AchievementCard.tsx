"use client";

import { motion } from "framer-motion";
import { Trophy, Star, Users, Compass, Flag, Sparkles, LucideIcon } from "lucide-react";
import {
  Achievement,
  AchievementCardConfig,
  AchievementCardStyle,
  TIER_CONFIG,
  CATEGORY_CONFIG,
  AchievementCategory
} from "@/types/achievement";

interface AchievementCardProps {
  achievement: Achievement;
  config?: Partial<AchievementCardConfig>;
  username?: string;
  userAvatar?: string;
  onShare?: () => void;
  className?: string;
}

const defaultConfig: AchievementCardConfig = {
  style: 'default',
  showUsername: true,
  showProgress: true,
  showRarity: true,
  showDate: true,
  animated: true,
};

const CATEGORY_ICONS: Record<AchievementCategory, LucideIcon> = {
  curator: Star,
  social: Users,
  explorer: Compass,
  champion: Trophy,
  milestone: Flag,
};

// Style presets for different card appearances
const STYLE_PRESETS: Record<AchievementCardStyle, {
  background: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}> = {
  default: {
    background: 'linear-gradient(135deg, rgba(15, 20, 35, 0.98) 0%, rgba(20, 28, 48, 0.95) 50%, rgba(15, 20, 35, 0.98) 100%)',
    cardBg: 'rgba(255, 255, 255, 0.03)',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  minimal: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    cardBg: 'rgba(255, 255, 255, 0.02)',
    textPrimary: '#e2e8f0',
    textSecondary: '#64748b',
    border: 'rgba(255, 255, 255, 0.05)',
  },
  vibrant: {
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    cardBg: 'rgba(139, 92, 246, 0.1)',
    textPrimary: '#ffffff',
    textSecondary: '#c4b5fd',
    border: 'rgba(139, 92, 246, 0.3)',
  },
  dark: {
    background: 'linear-gradient(135deg, #0a0a0a 0%, #171717 100%)',
    cardBg: 'rgba(255, 255, 255, 0.02)',
    textPrimary: '#fafafa',
    textSecondary: '#71717a',
    border: 'rgba(255, 255, 255, 0.05)',
  },
  neon: {
    background: 'linear-gradient(135deg, #0d0d0d 0%, #1a0a2e 100%)',
    cardBg: 'rgba(6, 182, 212, 0.05)',
    textPrimary: '#22d3ee',
    textSecondary: '#67e8f9',
    border: 'rgba(6, 182, 212, 0.3)',
  },
};

export function AchievementCard({
  achievement,
  config: userConfig,
  username,
  userAvatar,
  onShare,
  className = '',
}: AchievementCardProps) {
  const config = { ...defaultConfig, ...userConfig };
  const tierConfig = TIER_CONFIG[achievement.tier];
  const categoryConfig = CATEGORY_CONFIG[achievement.category];
  const stylePreset = STYLE_PRESETS[config.style];
  const CategoryIcon = CATEGORY_ICONS[achievement.category];

  const formattedDate = achievement.unlockedAt
    ? new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const progressPercentage = achievement.progress
    ? Math.min(100, (achievement.progress.current / achievement.progress.target) * 100)
    : achievement.unlocked ? 100 : 0;

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: stylePreset.background,
        boxShadow: `
          0 25px 50px -12px rgba(0, 0, 0, 0.5),
          0 0 80px ${tierConfig.glow},
          inset 0 1px 0 rgba(255, 255, 255, 0.05)
        `,
      }}
      initial={config.animated ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      data-testid="achievement-card"
    >
      {/* Tier glow effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${tierConfig.glow} 0%, transparent 60%)`,
        }}
      />

      {/* Animated sparkles for unlocked achievements */}
      {achievement.unlocked && config.animated && (
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + (i % 3) * 20}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            >
              <Sparkles className="w-3 h-3" style={{ color: tierConfig.color }} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="relative p-6">
        {/* Header: Category badge and tier */}
        <div className="flex items-start justify-between mb-4">
          {/* Category badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: `${categoryConfig.color}20`,
              border: `1px solid ${categoryConfig.color}40`,
            }}
          >
            <CategoryIcon className="w-4 h-4" style={{ color: categoryConfig.color }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: categoryConfig.color }}
            >
              {categoryConfig.label}
            </span>
          </div>

          {/* Tier badge */}
          <div
            className="px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider"
            style={{
              background: tierConfig.gradient,
              color: achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff',
              boxShadow: `0 0 20px ${tierConfig.glow}`,
            }}
          >
            {tierConfig.label}
          </div>
        </div>

        {/* Achievement icon/visual */}
        <div className="flex items-center gap-4 mb-5">
          <motion.div
            className="relative flex-shrink-0"
            animate={config.animated && achievement.unlocked ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: tierConfig.gradient,
                boxShadow: `0 0 30px ${tierConfig.glow}`,
              }}
            >
              <Trophy
                className="w-10 h-10"
                style={{
                  color: achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff'
                }}
              />
            </div>

            {/* Unlock indicator */}
            {achievement.unlocked && (
              <motion.div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: '#10b981' }}
                initial={config.animated ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.div>

          {/* Title and description */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-xl font-bold mb-1 truncate"
              style={{ color: stylePreset.textPrimary }}
            >
              {achievement.title}
            </h3>
            <p
              className="text-sm line-clamp-2"
              style={{ color: stylePreset.textSecondary }}
            >
              {achievement.description}
            </p>
          </div>
        </div>

        {/* Progress bar (if applicable) */}
        {config.showProgress && (achievement.progress || !achievement.unlocked) && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span style={{ color: stylePreset.textSecondary }}>Progress</span>
              <span style={{ color: tierConfig.color }}>
                {achievement.progress
                  ? `${achievement.progress.current}/${achievement.progress.target}`
                  : achievement.unlocked ? 'Complete' : 'Locked'
                }
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: tierConfig.gradient }}
                initial={config.animated ? { width: 0 } : false}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div
          className="flex items-center gap-4 pt-4"
          style={{ borderTop: `1px solid ${stylePreset.border}` }}
        >
          {/* Points */}
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4" style={{ color: tierConfig.color }} />
            <span className="text-sm font-semibold" style={{ color: stylePreset.textPrimary }}>
              {achievement.points} pts
            </span>
          </div>

          {/* Rarity */}
          {config.showRarity && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm" style={{ color: stylePreset.textSecondary }}>
                {achievement.rarity < 5 ? 'Ultra Rare' :
                 achievement.rarity < 15 ? 'Rare' :
                 achievement.rarity < 40 ? 'Uncommon' : 'Common'}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{
                background: `${tierConfig.color}20`,
                color: tierConfig.color
              }}>
                {achievement.rarity.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Date unlocked */}
          {config.showDate && formattedDate && (
            <span className="text-xs" style={{ color: stylePreset.textSecondary }}>
              {formattedDate}
            </span>
          )}
        </div>

        {/* Username footer */}
        {config.showUsername && username && (
          <div
            className="flex items-center gap-3 mt-4 pt-4"
            style={{ borderTop: `1px solid ${stylePreset.border}` }}
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={username}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: tierConfig.gradient, color: '#000' }}
              >
                {username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium" style={{ color: stylePreset.textPrimary }}>
              {username}
            </span>
            <div className="flex-1" />
            {/* GOAT branding */}
            <div
              className="text-xs font-extrabold"
              style={{
                background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              G.O.A.T.
            </div>
          </div>
        )}

        {/* Share button (optional) */}
        {onShare && (
          <motion.button
            onClick={onShare}
            className="absolute top-4 right-4 p-2 rounded-full transition-colors"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${stylePreset.border}`,
            }}
            whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            data-testid="achievement-share-btn"
          >
            <svg
              className="w-4 h-4"
              style={{ color: stylePreset.textSecondary }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// Compact version for lists
export function AchievementCardCompact({
  achievement,
  onClick,
  className = '',
}: {
  achievement: Achievement;
  onClick?: () => void;
  className?: string;
}) {
  const tierConfig = TIER_CONFIG[achievement.tier];
  const CategoryIcon = CATEGORY_ICONS[achievement.category];

  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${achievement.unlocked ? tierConfig.borderColor : 'rgba(255, 255, 255, 0.05)'}`,
      }}
      whileHover={{ scale: 1.02, background: 'rgba(255, 255, 255, 0.05)' }}
      whileTap={{ scale: 0.98 }}
      data-testid="achievement-card-compact"
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: achievement.unlocked ? tierConfig.gradient : 'rgba(255, 255, 255, 0.05)',
          opacity: achievement.unlocked ? 1 : 0.5,
        }}
      >
        <CategoryIcon
          className="w-6 h-6"
          style={{
            color: achievement.unlocked
              ? (achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff')
              : '#64748b'
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white truncate">{achievement.title}</span>
          {achievement.unlocked && (
            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{
              background: tierConfig.gradient,
              color: achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff',
            }}
          >
            {tierConfig.label}
          </span>
          <span className="text-xs text-gray-500">{achievement.points} pts</span>
        </div>
      </div>

      {/* Arrow */}
      <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </motion.button>
  );
}
