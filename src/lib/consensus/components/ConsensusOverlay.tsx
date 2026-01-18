"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Users,
  TrendingUp,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  ChevronDown,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import {
  HeatmapViewMode,
  HeatmapConfig,
  CommunityRanking,
  ItemConsensus,
  UserVsCommunityComparison,
} from "../types";
import { HeatmapLegend } from "../HeatmapRenderer";

/**
 * Mode selector option
 */
interface ModeOption {
  mode: HeatmapViewMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'consensus',
    label: 'Consensus',
    description: 'Show community agreement',
    icon: <Users className="w-4 h-4" />,
  },
  {
    mode: 'controversy',
    label: 'Controversy',
    description: 'Highlight debated items',
    icon: <Flame className="w-4 h-4" />,
  },
  {
    mode: 'yourPick',
    label: 'Your Pick',
    description: 'Compare to community',
    icon: <Target className="w-4 h-4" />,
  },
  {
    mode: 'trending',
    label: 'Trending',
    description: 'Rapidly changing consensus',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    mode: 'variance',
    label: 'Variance',
    description: 'Show rank spread',
    icon: <BarChart3 className="w-4 h-4" />,
  },
];

/**
 * Heatmap Toggle Button
 */
export const HeatmapToggle = memo(function HeatmapToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
      style={{
        background: enabled
          ? "rgba(34, 197, 94, 0.2)"
          : "rgba(51, 65, 85, 0.4)",
        border: enabled
          ? "1px solid rgba(34, 197, 94, 0.4)"
          : "1px solid rgba(71, 85, 105, 0.3)",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
    >
      {enabled ? (
        <Eye className="w-4 h-4 text-green-400" />
      ) : (
        <EyeOff className="w-4 h-4 text-slate-400" />
      )}
      <span
        className={`text-sm font-medium ${
          enabled ? "text-white" : "text-slate-400"
        }`}
      >
        Heatmap
      </span>
    </motion.button>
  );
});

/**
 * Mode Selector Dropdown
 */
export const ModeSelector = memo(function ModeSelector({
  currentMode,
  onModeChange,
}: {
  currentMode: HeatmapViewMode;
  onModeChange: (mode: HeatmapViewMode) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = MODE_OPTIONS.find((o) => o.mode === currentMode) || MODE_OPTIONS[0];

  return (
    <div className="relative">
      <motion.button
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          background: "rgba(51, 65, 85, 0.4)",
          border: "1px solid rgba(71, 85, 105, 0.3)",
        }}
        whileHover={{ background: "rgba(71, 85, 105, 0.5)" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-slate-400">{currentOption.icon}</span>
        <span className="text-sm font-medium text-white">
          {currentOption.label}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-2 w-56 rounded-xl overflow-hidden z-50"
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              border: "1px solid rgba(71, 85, 105, 0.4)",
              backdropFilter: "blur(12px)",
            }}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            {MODE_OPTIONS.map((option) => (
              <motion.button
                key={option.mode}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  background:
                    currentMode === option.mode
                      ? "rgba(34, 197, 94, 0.1)"
                      : "transparent",
                }}
                whileHover={{ background: "rgba(71, 85, 105, 0.4)" }}
                onClick={() => {
                  onModeChange(option.mode);
                  setIsOpen(false);
                }}
              >
                <span
                  className={
                    currentMode === option.mode
                      ? "text-green-400"
                      : "text-slate-400"
                  }
                >
                  {option.icon}
                </span>
                <div>
                  <div className="text-sm font-medium text-white">
                    {option.label}
                  </div>
                  <div className="text-xs text-slate-500">
                    {option.description}
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Opacity Slider
 */
export const OpacitySlider = memo(function OpacitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500">Opacity</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value * 100}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        className="w-24 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-green-400"
      />
      <span className="text-xs text-slate-400 w-8">{Math.round(value * 100)}%</span>
    </div>
  );
});

/**
 * Community Stats Mini Card
 */
export const CommunityStatsCard = memo(function CommunityStatsCard({
  community,
}: {
  community: CommunityRanking;
}) {
  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: "rgba(51, 65, 85, 0.3)",
        border: "1px solid rgba(71, 85, 105, 0.2)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-white">Community Data</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">Rankings</span>
          <div className="text-white font-medium">
            {Math.round(community.totalRankings).toLocaleString()}
          </div>
        </div>
        <div>
          <span className="text-slate-500">Consensus</span>
          <div className="text-white font-medium">
            {community.overallConsensus}%
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * User Comparison Card
 */
export const UserComparisonCard = memo(function UserComparisonCard({
  comparison,
}: {
  comparison: UserVsCommunityComparison;
}) {
  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: "rgba(139, 92, 246, 0.1)",
        border: "1px solid rgba(139, 92, 246, 0.3)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-white">Your Rankings</span>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Agreement Score</span>
          <span
            className={`font-medium ${
              comparison.agreementScore >= 70
                ? "text-green-400"
                : comparison.agreementScore >= 40
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {comparison.agreementScore}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Matching Positions</span>
          <span className="text-white font-medium">
            {comparison.matchingPositions}/{comparison.totalItems}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Outlier Picks</span>
          <span className="text-orange-400 font-medium">
            {comparison.outliers.length}
          </span>
        </div>
      </div>
    </div>
  );
});

/**
 * Controversial Items List
 */
export const ControversialList = memo(function ControversialList({
  items,
  limit = 5,
}: {
  items: ItemConsensus[];
  limit?: number;
}) {
  const topControversial = items
    .sort((a, b) => b.controversyScore - a.controversyScore)
    .slice(0, limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="w-4 h-4 text-red-400" />
        <span className="text-sm font-medium text-white">Most Debated</span>
      </div>
      {topControversial.map((item, index) => (
        <motion.div
          key={item.itemId}
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ background: "rgba(239, 68, 68, 0.1)" }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <span className="text-xs text-slate-500 w-4">#{index + 1}</span>
          <div className="flex-1 text-xs text-white truncate">
            {item.itemName || item.itemId}
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: `hsl(${(100 - item.controversyScore) * 1.2}, 70%, 50%)`,
              }}
            />
            <span className="text-xs text-slate-400">
              {item.controversyScore}%
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

/**
 * Consensus Winners List
 */
export const ConsensusWinnersList = memo(function ConsensusWinnersList({
  items,
  limit = 5,
}: {
  items: ItemConsensus[];
  limit?: number;
}) {
  const topConsensus = items
    .sort((a, b) => b.consensusScore - a.consensusScore)
    .slice(0, limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-white">Most Agreed</span>
      </div>
      {topConsensus.map((item, index) => (
        <motion.div
          key={item.itemId}
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ background: "rgba(34, 197, 94, 0.1)" }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <span className="text-xs text-slate-500 w-4">#{index + 1}</span>
          <div className="flex-1 text-xs text-white truncate">
            {item.itemName || item.itemId}
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: `hsl(${item.consensusScore * 1.2}, 70%, 50%)`,
              }}
            />
            <span className="text-xs text-slate-400">
              {item.consensusScore}%
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

/**
 * Main Consensus Overlay Panel
 */
export const ConsensusOverlayPanel = memo(function ConsensusOverlayPanel({
  config,
  community,
  comparison,
  onConfigChange,
}: {
  config: HeatmapConfig;
  community: CommunityRanking | null;
  comparison: UserVsCommunityComparison | null;
  onConfigChange: (updates: Partial<HeatmapConfig>) => void;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(30, 41, 59, 0.6)",
        border: "1px solid rgba(71, 85, 105, 0.3)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-white">Consensus Heatmap</h3>
        </div>
        <HeatmapToggle
          enabled={config.enabled}
          onToggle={() => onConfigChange({ enabled: !config.enabled })}
        />
      </div>

      {/* Content */}
      <AnimatePresence>
        {config.enabled && (
          <motion.div
            className="p-4 space-y-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Mode selector */}
            <div className="flex items-center justify-between">
              <ModeSelector
                currentMode={config.mode}
                onModeChange={(mode) => onConfigChange({ mode })}
              />
              <OpacitySlider
                value={config.opacity}
                onChange={(opacity) => onConfigChange({ opacity })}
              />
            </div>

            {/* Legend */}
            <HeatmapLegend mode={config.mode} colorScheme={config.colorScheme} />

            {/* Stats */}
            {community && <CommunityStatsCard community={community} />}

            {/* User comparison */}
            {comparison && config.mode === 'yourPick' && (
              <UserComparisonCard comparison={comparison} />
            )}

            {/* Item lists */}
            {community && config.mode === 'controversy' && (
              <ControversialList items={community.items} />
            )}

            {community && config.mode === 'consensus' && (
              <ConsensusWinnersList items={community.items} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disabled state */}
      {!config.enabled && (
        <div className="p-4 text-center">
          <p className="text-sm text-slate-500">
            Enable heatmap to see community consensus
          </p>
        </div>
      )}
    </div>
  );
});

export default ConsensusOverlayPanel;
