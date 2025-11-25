"use client";

import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Sparkles, Crown, Star, Flame } from 'lucide-react';
import { LeaderboardEntry as LeaderboardEntryType } from '@/types/challenges';
import { getBadgeDefinition } from '@/lib/badge-definitions';

interface LeaderboardEntryProps {
  entry: LeaderboardEntryType;
  isTopThree?: boolean;
  animate?: boolean;
  delay?: number;
}

// Rank configuration with premium styling
const rankConfig: Record<number, {
  gradient: string;
  glowColor: string;
  icon: React.ReactNode;
  badgeGradient: string;
}> = {
  1: {
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    glowColor: 'rgba(234,179,8,0.4)',
    icon: <Crown className="w-5 h-5 text-yellow-300" />,
    badgeGradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
  },
  2: {
    gradient: 'from-gray-200 via-gray-300 to-gray-400',
    glowColor: 'rgba(156,163,175,0.3)',
    icon: <Medal className="w-5 h-5 text-gray-200" />,
    badgeGradient: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%)',
  },
  3: {
    gradient: 'from-orange-500 via-amber-600 to-yellow-700',
    glowColor: 'rgba(217,119,6,0.3)',
    icon: <Award className="w-5 h-5 text-orange-300" />,
    badgeGradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%)',
  },
};

export function LeaderboardEntry({ entry, isTopThree, animate, delay = 0 }: LeaderboardEntryProps) {
  const config = rankConfig[entry.rank];
  const Container = animate ? motion.div : 'div';
  
  const containerProps = animate
    ? {
        initial: { opacity: 0, x: -30, scale: 0.95 },
        animate: { opacity: 1, x: 0, scale: 1 },
        transition: { 
          delay, 
          duration: 0.5,
          ease: [0.23, 1, 0.32, 1],
        },
      }
    : {};

  return (
    <Container
      {...containerProps}
      className="group relative"
      data-testid={`leaderboard-entry-${entry.rank}`}
    >
      {/* Glow effect for top 3 */}
      {isTopThree && config && (
        <div 
          className="absolute -inset-px rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
          style={{ background: config.badgeGradient }}
        />
      )}
      
      <div 
        className={`
          relative overflow-hidden rounded-2xl transition-all duration-500 group-hover:-translate-y-0.5
          ${isTopThree ? '' : 'group-hover:border-gray-500/50'}
        `}
        style={{
          background: isTopThree 
            ? "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          border: `1px solid ${isTopThree ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Rank badge - 3D style */}
        <div className="absolute top-0 left-0 h-full w-14">
          <div 
            className="flex items-center justify-center h-full"
            style={{
              background: isTopThree && config 
                ? config.badgeGradient 
                : "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              boxShadow: isTopThree && config 
                ? `inset -2px 0 10px rgba(0,0,0,0.2), 0 0 20px ${config.glowColor}`
                : "inset -2px 0 10px rgba(0,0,0,0.1)",
            }}
          >
            {config?.icon || (
              <span className="text-sm font-bold text-gray-400">#{entry.rank}</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="pl-18 pr-5 py-4 ml-14">
          <div className="flex items-center justify-between gap-4">
            {/* User info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar with glow */}
              <div className="relative flex-shrink-0">
                {isTopThree && config && (
                  <div 
                    className="absolute -inset-1 rounded-full blur-sm opacity-60"
                    style={{ background: config.badgeGradient }}
                  />
                )}
                <div
                  className="relative w-11 h-11 rounded-full overflow-hidden"
                  style={{
                    border: `2px solid ${isTopThree ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: isTopThree ? `0 0 20px ${config?.glowColor}` : "none",
                  }}
                >
                  {entry.user_avatar ? (
                    <img
                      src={entry.user_avatar}
                      alt={entry.user_name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                      }}
                    >
                      <span className="text-white text-sm font-bold">
                        {(entry.user_name || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {entry.is_premium && (
                  <motion.div 
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                      boxShadow: "0 0 10px rgba(168,85,247,0.5)",
                    }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </div>

              {/* Name and stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-semibold truncate ${isTopThree ? 'text-white' : 'text-gray-200'}`}>
                    {entry.user_name || `User ${entry.user_id.slice(0, 8)}`}
                  </h4>
                  {entry.is_premium && (
                    <span 
                      className="px-2 py-0.5 text-[10px] font-bold rounded-full"
                      style={{
                        background: "linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(236,72,153,0.2) 100%)",
                        border: "1px solid rgba(168,85,247,0.4)",
                        color: "#c084fc",
                      }}
                    >
                      PRO
                    </span>
                  )}
                  {isTopThree && entry.rank === 1 && (
                    <Flame className="w-4 h-4 text-orange-400" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-cyan-500" />
                    {entry.entry_count} challenges
                  </span>
                  {entry.badges.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      {entry.badges.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Score */}
            <div className="text-right flex-shrink-0">
              <motion.div
                className={`text-2xl font-black ${isTopThree && config ? `bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent` : 'text-white'}`}
                initial={animate ? { scale: 0.5 } : undefined}
                animate={animate ? { scale: 1 } : undefined}
                transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
              >
                {entry.score.toLocaleString()}
              </motion.div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">points</div>
            </div>
          </div>

          {/* Badges with premium styling */}
          {entry.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
              {entry.badges.slice(0, 5).map((badge, i) => {
                const definition = getBadgeDefinition(badge.badge_type);
                return (
                  <motion.div
                    key={badge.id}
                    initial={animate ? { opacity: 0, scale: 0 } : undefined}
                    animate={animate ? { opacity: 1, scale: 1 } : undefined}
                    transition={{ delay: delay + 0.3 + i * 0.05 }}
                    className="group/badge relative px-2.5 py-1 rounded-lg transition-all duration-300 hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    title={definition.description}
                    data-testid={`badge-${badge.badge_type}`}
                  >
                    <span className="text-sm">{definition.icon}</span>
                    
                    {/* Tooltip */}
                    <div 
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none z-20"
                      style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                      }}
                    >
                      {definition.name}
                    </div>
                  </motion.div>
                );
              })}
              {entry.badges.length > 5 && (
                <div 
                  className="px-2.5 py-1 rounded-lg text-xs text-gray-400 font-medium"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  +{entry.badges.length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shimmer effect for top 3 */}
        {isTopThree && (
          <motion.div 
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 3 }}
            />
          </motion.div>
        )}
      </div>
    </Container>
  );
}
