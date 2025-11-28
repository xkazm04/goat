'use client';

import { motion } from 'framer-motion';
import {
  Trophy,
  Flame,
  Zap,
  Users,
  Target,
  Sparkles,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useItemConsensusUI } from '@/hooks/use-consensus';
import { useConsensusStore } from '@/stores/consensus-store';
import type { ConsensusBadge, ConsensusViewMode } from '@/types/consensus';
import { cn } from '@/lib/utils';

interface ConsensusOverlayProps {
  itemId: string;
  className?: string;
}

/**
 * Icon mapping for consensus badges
 */
const BadgeIcon = ({ icon }: { icon: ConsensusBadge['icon'] }) => {
  const iconProps = { className: 'w-3 h-3' };

  switch (icon) {
    case 'trophy':
      return <Trophy {...iconProps} />;
    case 'flame':
      return <Flame {...iconProps} />;
    case 'zap':
      return <Zap {...iconProps} />;
    case 'users':
      return <Users {...iconProps} />;
    case 'target':
      return <Target {...iconProps} />;
    case 'sparkles':
      return <Sparkles {...iconProps} />;
    default:
      return <Sparkles {...iconProps} />;
  }
};

/**
 * ConsensusOverlay
 *
 * Displays consensus ranking data overlay on collection items.
 * Shows median rank, volatility indicator, and peer cluster info
 * based on the current view mode.
 */
export function ConsensusOverlay({ itemId, className }: ConsensusOverlayProps) {
  const viewMode = useConsensusStore((state) => state.viewMode);

  const {
    consensus,
    volatilityLevel,
    volatilityColor,
    volatilityBgColor,
    badges,
    formattedMedianRank,
    formattedVolatility,
    formattedConfidence,
    shouldShowOverlay,
  } = useItemConsensusUI({ itemId });

  if (!shouldShowOverlay || !consensus) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'absolute inset-0 pointer-events-none flex flex-col justify-between p-1',
        className
      )}
      data-testid={`consensus-overlay-${itemId}`}
    >
      {/* Top: Rank badge */}
      <div className="flex justify-between items-start">
        <MedianRankBadge
          rank={formattedMedianRank}
          confidence={consensus.confidence}
          viewMode={viewMode}
        />

        {/* Volatility indicator */}
        {(viewMode === 'volatility' || viewMode === 'discovery') && (
          <VolatilityIndicator
            volatility={consensus.volatility}
            level={volatilityLevel}
            color={volatilityColor}
            bgColor={volatilityBgColor}
          />
        )}
      </div>

      {/* Bottom: Peer clusters or badges */}
      <div className="flex justify-between items-end">
        {/* Badges */}
        {(viewMode === 'discovery' || viewMode === 'median') &&
          badges.length > 0 && (
            <div className="flex gap-0.5">
              {badges.slice(0, 2).map((badge, i) => (
                <motion.div
                  key={badge.label}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    'p-0.5 rounded bg-black/60 backdrop-blur-sm',
                    badge.color
                  )}
                  title={badge.description}
                  data-testid={`consensus-badge-${badge.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <BadgeIcon icon={badge.icon} />
                </motion.div>
              ))}
            </div>
          )}

        {/* Peer clusters mini-view */}
        {(viewMode === 'peers' || viewMode === 'discovery') &&
          consensus.peerClusters.length > 0 && (
            <PeerClusterIndicator clusters={consensus.peerClusters} />
          )}
      </div>
    </motion.div>
  );
}

/**
 * Median rank badge component
 */
function MedianRankBadge({
  rank,
  confidence,
  viewMode,
}: {
  rank: string;
  confidence: number;
  viewMode: ConsensusViewMode;
}) {
  // Color based on rank
  const rankNum = parseInt(rank.replace('#', ''));
  let bgColor = 'bg-gray-800/80';
  let textColor = 'text-white';
  let ringColor = 'ring-gray-600';

  if (rankNum <= 3) {
    bgColor = 'bg-gradient-to-br from-yellow-500 to-amber-600';
    textColor = 'text-black font-bold';
    ringColor = 'ring-yellow-400/50';
  } else if (rankNum <= 10) {
    bgColor = 'bg-gradient-to-br from-cyan-600 to-blue-700';
    textColor = 'text-white font-semibold';
    ringColor = 'ring-cyan-400/50';
  } else if (rankNum <= 25) {
    bgColor = 'bg-gradient-to-br from-purple-600 to-indigo-700';
    textColor = 'text-white';
    ringColor = 'ring-purple-400/30';
  }

  // Confidence ring width
  const ringWidth = confidence >= 0.7 ? 'ring-2' : confidence >= 0.4 ? 'ring-1' : '';

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'min-w-[24px] h-5 px-1 rounded text-[10px] flex items-center justify-center',
        'backdrop-blur-sm shadow-lg',
        bgColor,
        textColor,
        ringWidth,
        ringColor
      )}
      data-testid="consensus-median-rank"
    >
      {viewMode === 'discovery' ? (
        <span className="flex items-center gap-0.5">
          <TrendingUp className="w-2.5 h-2.5" />
          {rank}
        </span>
      ) : (
        rank
      )}
    </motion.div>
  );
}

/**
 * Volatility indicator component
 */
function VolatilityIndicator({
  volatility,
  level,
  color,
  bgColor,
}: {
  volatility: number;
  level: string | null;
  color: string;
  bgColor: string;
}) {
  if (!level) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px]',
        'backdrop-blur-sm',
        bgColor,
        color
      )}
      title={`Volatility: ${volatility.toFixed(1)} (${level})`}
      data-testid="consensus-volatility"
    >
      <Activity className="w-2.5 h-2.5" />
      <span className="font-medium">±{volatility.toFixed(1)}</span>
    </motion.div>
  );
}

/**
 * Peer cluster indicator showing mini dots for each cluster
 */
function PeerClusterIndicator({
  clusters,
}: {
  clusters: Array<{ clusterId: string; label: string; color: string; clusterMedianRank: number }>;
}) {
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    emerald: 'bg-emerald-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-0.5 items-center bg-black/60 backdrop-blur-sm rounded px-1 py-0.5"
      data-testid="consensus-peer-clusters"
    >
      <Users className="w-2 h-2 text-gray-400" />
      {clusters.slice(0, 3).map((cluster) => (
        <motion.div
          key={cluster.clusterId}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            'w-2 h-2 rounded-full',
            colorMap[cluster.color] || 'bg-gray-500'
          )}
          title={`${cluster.label}: #${cluster.clusterMedianRank}`}
        />
      ))}
    </motion.div>
  );
}

export default ConsensusOverlay;
