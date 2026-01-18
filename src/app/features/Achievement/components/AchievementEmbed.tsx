"use client";

import { motion } from "framer-motion";
import { Trophy, Star, ExternalLink } from "lucide-react";
import { Achievement, TIER_CONFIG, CATEGORY_CONFIG } from "@/types/achievement";

interface AchievementEmbedProps {
  achievement: Achievement;
  username?: string;
  shareUrl: string;
  compact?: boolean;
}

/**
 * Embeddable achievement card for external sites
 * Lightweight, standalone component with minimal dependencies
 */
export function AchievementEmbed({
  achievement,
  username,
  shareUrl,
  compact = false,
}: AchievementEmbedProps) {
  const tierConfig = TIER_CONFIG[achievement.tier];
  const categoryConfig = CATEGORY_CONFIG[achievement.category];

  if (compact) {
    return (
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors text-decoration-none"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: tierConfig.gradient }}
        >
          <Trophy
            className="w-5 h-5"
            style={{
              color: achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff',
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{achievement.title}</p>
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

        {/* GOAT branding */}
        <div
          className="text-xs font-bold"
          style={{
            background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          G.O.A.T.
        </div>
      </a>
    );
  }

  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden text-decoration-none"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: 'linear-gradient(135deg, #0f1423 0%, #141c30 50%, #0f1423 100%)',
        boxShadow: `0 20px 40px -12px rgba(0, 0, 0, 0.4), 0 0 60px ${tierConfig.glow}20`,
        maxWidth: 400,
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${tierConfig.glow}15 0%, transparent 60%)`,
        }}
      />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          {/* Category badge */}
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{
              background: `${categoryConfig.color}20`,
              border: `1px solid ${categoryConfig.color}40`,
              color: categoryConfig.color,
            }}
          >
            {categoryConfig.label}
          </span>

          {/* Tier badge */}
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase"
            style={{
              background: tierConfig.gradient,
              color: achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff',
            }}
          >
            {tierConfig.label}
          </span>
        </div>

        {/* Achievement info */}
        <div className="flex items-center gap-4 mb-4">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: tierConfig.gradient,
              boxShadow: `0 0 30px ${tierConfig.glow}40`,
            }}
          >
            <Trophy
              className="w-8 h-8"
              style={{
                color: achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff',
              }}
            />
          </div>

          {/* Title and description */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1">{achievement.title}</h3>
            <p className="text-sm text-gray-400 line-clamp-2">{achievement.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/5">
          {/* Points */}
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4" style={{ color: tierConfig.color }} />
            <span className="text-sm text-white font-medium">{achievement.points} pts</span>
          </div>

          {/* Rarity */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-400">
              {achievement.rarity < 5 ? 'Ultra Rare' :
               achievement.rarity < 15 ? 'Rare' :
               achievement.rarity < 40 ? 'Uncommon' : 'Common'}
            </span>
          </div>

          <div className="flex-1" />

          {/* View link */}
          <div className="flex items-center gap-1 text-xs text-cyan-400">
            <span>View on G.O.A.T.</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>

        {/* Username footer */}
        {username && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)',
                color: '#000',
              }}
            >
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-300">{username}</span>
            <div className="flex-1" />
            <div
              className="text-sm font-extrabold"
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
      </div>
    </a>
  );
}

/**
 * Standalone embed component that can be rendered in an iframe
 * Self-contained with all styles inline
 */
export function AchievementEmbedStandalone({
  achievement,
  username,
  shareUrl,
}: {
  achievement: Achievement;
  username?: string;
  shareUrl: string;
}) {
  const tierConfig = TIER_CONFIG[achievement.tier];
  const categoryConfig = CATEGORY_CONFIG[achievement.category];

  // Generate inline styles for iframe embedding
  const containerStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: 'linear-gradient(135deg, #0f1423 0%, #141c30 50%, #0f1423 100%)',
    borderRadius: '16px',
    overflow: 'hidden',
    maxWidth: '400px',
    margin: '0 auto',
  };

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{achievement.title} - G.O.A.T. Achievement</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: transparent;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
          }
          a { text-decoration: none; color: inherit; }
        `}</style>
      </head>
      <body>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={containerStyle}>
          <div style={{ position: 'relative', padding: '20px' }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                background: `${categoryConfig.color}20`,
                border: `1px solid ${categoryConfig.color}40`,
                color: categoryConfig.color,
              }}>
                {categoryConfig.label}
              </span>
              <span style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: tierConfig.gradient,
                color: achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff',
              }}>
                {tierConfig.label}
              </span>
            </div>

            {/* Main content */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: tierConfig.gradient,
                boxShadow: `0 0 30px ${tierConfig.glow}40`,
                flexShrink: 0,
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff'} strokeWidth="2">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                  {achievement.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                  {achievement.description}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={tierConfig.color}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>
                  {achievement.points} pts
                </span>
              </div>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                {achievement.rarity.toFixed(1)}% rarity
              </span>
              <div style={{ flex: 1 }} />
              <span style={{
                fontSize: '14px',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                G.O.A.T.
              </span>
            </div>
          </div>
        </a>
      </body>
    </html>
  );
}
