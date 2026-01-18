"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { List, Layers, GitBranch, Lock } from "lucide-react";
import { RankingFormat, FORMAT_CONFIGS } from "./types";

interface FormatSwitcherProps {
  selectedFormat: RankingFormat;
  onFormatChange: (format: RankingFormat) => void;
  color: { primary: string; secondary: string; accent: string };
  compact?: boolean;
  disabled?: RankingFormat[];
}

const FORMAT_ICONS = {
  standard: List,
  tier: Layers,
  bracket: GitBranch,
};

/**
 * Format Switcher Component
 * Allows switching between different ranking formats
 */
export const FormatSwitcher = memo(function FormatSwitcher({
  selectedFormat,
  onFormatChange,
  color,
  compact = false,
  disabled = ["bracket"], // Bracket disabled by default (out of scope)
}: FormatSwitcherProps) {
  const formats = Object.entries(FORMAT_CONFIGS) as [RankingFormat, typeof FORMAT_CONFIGS[RankingFormat]][];

  if (compact) {
    return (
      <div className="flex gap-1">
        {formats.map(([format, config]) => {
          const Icon = FORMAT_ICONS[format];
          const isSelected = selectedFormat === format;
          const isDisabled = disabled.includes(format);

          return (
            <motion.button
              key={format}
              className={`p-2 rounded-lg ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${color.primary}40, ${color.secondary}30)`
                  : "rgba(51, 65, 85, 0.3)",
                border: `1px solid ${isSelected ? color.primary : "rgba(71, 85, 105, 0.3)"}40`,
                opacity: isDisabled ? 0.4 : 1,
              }}
              whileHover={!isDisabled ? { scale: 1.05 } : undefined}
              whileTap={!isDisabled ? { scale: 0.95 } : undefined}
              onClick={() => !isDisabled && onFormatChange(format)}
              disabled={isDisabled}
              title={isDisabled ? `${config.label} coming soon` : config.description}
            >
              <Icon
                className="w-4 h-4"
                style={{
                  color: isSelected ? color.accent : "rgba(148, 163, 184, 0.6)",
                }}
              />
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-3">
        Ranking Format
      </label>

      <div className="grid grid-cols-3 gap-2">
        {formats.map(([format, config]) => {
          const Icon = FORMAT_ICONS[format];
          const isSelected = selectedFormat === format;
          const isDisabled = disabled.includes(format);

          return (
            <motion.button
              key={format}
              className={`relative p-4 rounded-xl text-left ${
                isDisabled ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${color.primary}30, ${color.secondary}20)`
                  : "rgba(51, 65, 85, 0.3)",
                border: `2px solid ${
                  isSelected ? color.primary : "rgba(71, 85, 105, 0.3)"
                }60`,
                boxShadow: isSelected
                  ? `0 8px 20px ${color.primary}20, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
                  : "none",
                opacity: isDisabled ? 0.5 : 1,
              }}
              whileHover={
                !isDisabled
                  ? {
                      scale: 1.02,
                      boxShadow: `0 10px 25px ${color.primary}30`,
                    }
                  : undefined
              }
              whileTap={!isDisabled ? { scale: 0.98 } : undefined}
              onClick={() => !isDisabled && onFormatChange(format)}
              disabled={isDisabled}
            >
              {/* Disabled overlay */}
              {isDisabled && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-[1px]">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Lock className="w-3 h-3" />
                    <span>Soon</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{
                    background: isSelected
                      ? `${color.accent}20`
                      : "rgba(71, 85, 105, 0.3)",
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color: isSelected ? color.accent : "rgba(148, 163, 184, 0.6)",
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium mb-0.5 ${
                      isSelected ? "text-white" : "text-slate-300"
                    }`}
                  >
                    {config.label}
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-2">
                    {config.description}
                  </div>
                </div>

                {/* Selection indicator */}
                <motion.div
                  className="absolute top-2 right-2 w-4 h-4 rounded-full border-2"
                  style={{
                    borderColor: isSelected ? color.accent : "rgba(71, 85, 105, 0.4)",
                    background: isSelected
                      ? `linear-gradient(135deg, ${color.primary}, ${color.accent})`
                      : "transparent",
                  }}
                  animate={{
                    scale: isSelected ? 1 : 0.8,
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Format preview/explanation */}
      <motion.div
        className="mt-4 p-3 rounded-lg"
        style={{
          background: "rgba(15, 23, 42, 0.4)",
          border: "1px solid rgba(71, 85, 105, 0.2)",
        }}
        key={selectedFormat}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-2">
          {(() => {
            const Icon = FORMAT_ICONS[selectedFormat];
            return <Icon className="w-4 h-4" style={{ color: color.accent }} />;
          })()}
          <span className="text-sm font-medium text-white">
            {FORMAT_CONFIGS[selectedFormat].label} Format
          </span>
        </div>

        {selectedFormat === "standard" && (
          <div className="text-xs text-slate-400">
            Classic numbered ranking from #1 to your list size. Each item gets a
            unique position. Perfect for definitive &quot;best of&quot; lists.
          </div>
        )}

        {selectedFormat === "tier" && (
          <div className="text-xs text-slate-400">
            Group items into tiers (S, A, B, C, D) instead of strict numbers.
            Great when items are close in quality and hard to separate.
          </div>
        )}

        {selectedFormat === "bracket" && (
          <div className="text-xs text-slate-400">
            Tournament-style elimination brackets. Items compete head-to-head
            until a champion emerges. Coming soon!
          </div>
        )}
      </motion.div>
    </div>
  );
});

/**
 * Compact format indicator badge
 */
export const FormatBadge = memo(function FormatBadge({
  format,
  color,
}: {
  format: RankingFormat;
  color: { primary: string; secondary: string; accent: string };
}) {
  const config = FORMAT_CONFIGS[format];
  const Icon = FORMAT_ICONS[format];

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
      style={{
        background: `${color.primary}20`,
        border: `1px solid ${color.primary}30`,
        color: color.accent,
      }}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
});
