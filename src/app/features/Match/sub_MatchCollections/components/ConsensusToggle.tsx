'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  TrendingUp,
  Activity,
  Users,
  Sparkles,
} from 'lucide-react';
import { useConsensusStore } from '@/stores/consensus-store';
import type { ConsensusViewMode } from '@/types/consensus';
import { cn } from '@/lib/utils';

/**
 * View mode configuration
 */
const VIEW_MODES: Array<{
  mode: ConsensusViewMode;
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}> = [
  {
    mode: 'off',
    icon: <EyeOff className="w-4 h-4" />,
    label: 'Classic View',
    shortLabel: 'Off',
    description: 'Traditional ranking without consensus data',
    color: 'text-gray-400',
  },
  {
    mode: 'median',
    icon: <TrendingUp className="w-4 h-4" />,
    label: 'Consensus Ranks',
    shortLabel: 'Ranks',
    description: 'Show median ranking across all users',
    color: 'text-cyan-400',
  },
  {
    mode: 'volatility',
    icon: <Activity className="w-4 h-4" />,
    label: 'Hot Debates',
    shortLabel: 'Debates',
    description: 'Highlight contested items with high disagreement',
    color: 'text-amber-400',
  },
  {
    mode: 'peers',
    icon: <Users className="w-4 h-4" />,
    label: 'Peer Clusters',
    shortLabel: 'Peers',
    description: 'Show how different user groups rank items',
    color: 'text-purple-400',
  },
  {
    mode: 'discovery',
    icon: <Sparkles className="w-4 h-4" />,
    label: 'Discovery Mode',
    shortLabel: 'Full',
    description: 'Full consensus discovery with all overlays',
    color: 'text-emerald-400',
  },
];

interface ConsensusToggleProps {
  className?: string;
  compact?: boolean;
}

/**
 * ConsensusToggle
 *
 * Toggle button/dropdown for switching between consensus view modes.
 * Allows users to discover where items naturally belong based on
 * global ranking distributions and peer consensus.
 */
export function ConsensusToggle({ className, compact = false }: ConsensusToggleProps) {
  const { viewMode, setViewMode, cycleViewMode, isLoading } = useConsensusStore();

  const currentConfig = VIEW_MODES.find((m) => m.mode === viewMode) || VIEW_MODES[0];
  const isActive = viewMode !== 'off';

  if (compact) {
    // Compact: single button that cycles through modes
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={cycleViewMode}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
          isActive
            ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
            : 'bg-gray-800/50 hover:bg-gray-700/50',
          className
        )}
        title={currentConfig.description}
        data-testid="consensus-toggle-compact"
      >
        <span className={cn('transition-colors', currentConfig.color)}>
          {currentConfig.icon}
        </span>
        <span className="text-xs font-medium text-gray-300">
          {currentConfig.shortLabel}
        </span>
        {isLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full"
          />
        )}
      </motion.button>
    );
  }

  // Full: segmented button group
  return (
    <div
      className={cn(
        'flex items-center gap-1 bg-gray-800/50 backdrop-blur-sm rounded-lg p-1',
        className
      )}
      role="radiogroup"
      aria-label="Consensus view mode"
      data-testid="consensus-toggle-group"
    >
      {VIEW_MODES.map((config) => (
        <motion.button
          key={config.mode}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setViewMode(config.mode)}
          className={cn(
            'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all text-xs',
            viewMode === config.mode
              ? 'text-white'
              : 'text-gray-500 hover:text-gray-300'
          )}
          title={config.description}
          role="radio"
          aria-checked={viewMode === config.mode}
          data-testid={`consensus-mode-${config.mode}`}
        >
          {/* Active indicator background */}
          {viewMode === config.mode && (
            <motion.div
              layoutId="consensus-active-bg"
              className={cn(
                'absolute inset-0 rounded-md',
                config.mode === 'off'
                  ? 'bg-gray-700/80'
                  : 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-white/10'
              )}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <span
            className={cn(
              'relative z-10 transition-colors',
              viewMode === config.mode ? config.color : ''
            )}
          >
            {config.icon}
          </span>
          <span className="relative z-10 hidden sm:inline font-medium">
            {config.shortLabel}
          </span>
        </motion.button>
      ))}

      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="pl-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ConsensusInfo
 *
 * Small info badge showing current consensus mode status
 */
export function ConsensusInfo({ className }: { className?: string }) {
  const viewMode = useConsensusStore((state) => state.viewMode);
  const config = VIEW_MODES.find((m) => m.mode === viewMode);

  if (!config || viewMode === 'off') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-gradient-to-r from-cyan-500/10 to-purple-500/10',
        'border border-cyan-500/20',
        'text-xs text-gray-300',
        className
      )}
      data-testid="consensus-info"
    >
      <Eye className="w-3 h-3 text-cyan-400" />
      <span>{config.label} Active</span>
    </motion.div>
  );
}

export default ConsensusToggle;
