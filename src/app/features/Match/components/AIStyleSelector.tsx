"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Crown,
  ChevronDown,
  ChevronUp,
  Search,
  Wand2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIStylePreset, CategoryTheme } from "../lib/ai/types";
import {
  AI_STYLE_PRESET_LIST,
  getRecommendedStyles,
  getAIStyleConfig,
  mapCategoryToTheme,
} from "../lib/ai/stylePresets";

export interface AIStyleSelectorProps {
  /** Currently selected style */
  selectedStyle: AIStylePreset;
  /** Called when style changes */
  onStyleChange: (style: AIStylePreset) => void;
  /** Category for recommendations */
  category?: string;
  /** Custom prompt value */
  customPrompt?: string;
  /** Called when custom prompt changes */
  onCustomPromptChange?: (prompt: string) => void;
  /** Whether AI generation is available */
  aiAvailable?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

interface StyleCardProps {
  style: typeof AI_STYLE_PRESET_LIST[0];
  isSelected: boolean;
  isRecommended: boolean;
  onClick: () => void;
  compact?: boolean;
}

function StyleCard({ style, isSelected, isRecommended, onClick, compact }: StyleCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative rounded-xl overflow-hidden transition-all duration-200",
        compact ? "h-20" : "h-28",
        isSelected
          ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 shadow-lg shadow-cyan-500/20"
          : "ring-1 ring-gray-700 hover:ring-gray-500"
      )}
      style={{
        background: style.thumbnailGradient,
      }}
    >
      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-2">
        {/* Badges */}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          {style.isPremium && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/90 text-black rounded-full flex items-center gap-0.5">
              <Crown className="w-2.5 h-2.5" />
              PRO
            </span>
          )}
          {isRecommended && !style.isPremium && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-cyan-500/90 text-white rounded-full">
              Recommended
            </span>
          )}
        </div>

        {/* Style name */}
        <h4 className={cn(
          "font-semibold text-white truncate",
          compact ? "text-xs" : "text-sm"
        )}>
          {style.name}
        </h4>
        {!compact && (
          <p className="text-[10px] text-gray-300 truncate">
            {style.description}
          </p>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          layoutId="style-selection"
          className="absolute inset-0 border-2 border-cyan-400 rounded-xl pointer-events-none"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
}

/**
 * AIStyleSelector - Style preset picker with custom prompt support
 *
 * Features:
 * - Grid of style presets with visual previews
 * - Category-aware recommendations
 * - Custom prompt input for personalization
 * - Premium style indicators
 * - Expandable/collapsible sections
 */
export function AIStyleSelector({
  selectedStyle,
  onStyleChange,
  category,
  customPrompt = "",
  onCustomPromptChange,
  aiAvailable = true,
  loading = false,
  compact = false,
}: AIStyleSelectorProps) {
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [showCustomPrompt, setShowCustomPrompt] = useState(!!customPrompt);
  const [searchQuery, setSearchQuery] = useState("");

  // Get category theme and recommended styles
  const categoryTheme = useMemo(
    () => category ? mapCategoryToTheme(category) : 'general' as CategoryTheme,
    [category]
  );

  const recommendedStyles = useMemo(
    () => getRecommendedStyles(categoryTheme),
    [categoryTheme]
  );

  const recommendedStyleIds = useMemo(
    () => new Set(recommendedStyles.map(s => s.id)),
    [recommendedStyles]
  );

  // Filter styles based on search
  const filteredStyles = useMemo(() => {
    if (!searchQuery.trim()) {
      return AI_STYLE_PRESET_LIST;
    }
    const query = searchQuery.toLowerCase();
    return AI_STYLE_PRESET_LIST.filter(style =>
      style.name.toLowerCase().includes(query) ||
      style.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Split into recommended and others
  const { recommended, others } = useMemo(() => {
    const recommended = filteredStyles.filter(s => recommendedStyleIds.has(s.id));
    const others = filteredStyles.filter(s => !recommendedStyleIds.has(s.id));
    return { recommended, others };
  }, [filteredStyles, recommendedStyleIds]);

  // Visible styles based on expanded state
  const visibleOthers = showAllStyles ? others : others.slice(0, compact ? 4 : 6);

  const handleCustomPromptChange = useCallback((value: string) => {
    // Limit to 500 characters
    if (value.length <= 500) {
      onCustomPromptChange?.(value);
    }
  }, [onCustomPromptChange]);

  if (!aiAvailable) {
    return (
      <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 text-center">
        <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-500" />
        <p className="text-sm text-gray-400">AI generation is not available</p>
        <p className="text-xs text-gray-500 mt-1">Using template-based generation</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", loading && "opacity-60 pointer-events-none")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">AI Art Style</h3>
        </div>
        {category && (
          <span className="text-xs text-gray-500">
            Showing styles for {categoryTheme}
          </span>
        )}
      </div>

      {/* Search (when many styles) */}
      {AI_STYLE_PRESET_LIST.length > 10 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search styles..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
          />
        </div>
      )}

      {/* Recommended Styles */}
      {recommended.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-cyan-400">
            <Sparkles className="w-3 h-3" />
            <span>Recommended for {category || 'your category'}</span>
          </div>
          <div className={cn(
            "grid gap-2",
            compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"
          )}>
            {recommended.map(style => (
              <StyleCard
                key={style.id}
                style={style}
                isSelected={selectedStyle === style.id}
                isRecommended={true}
                onClick={() => onStyleChange(style.id)}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Styles */}
      <div className="space-y-2">
        {recommended.length > 0 && (
          <span className="text-xs text-gray-500">More styles</span>
        )}
        <div className={cn(
          "grid gap-2",
          compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"
        )}>
          <AnimatePresence mode="popLayout">
            {visibleOthers.map(style => (
              <motion.div
                key={style.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <StyleCard
                  style={style}
                  isSelected={selectedStyle === style.id}
                  isRecommended={false}
                  onClick={() => onStyleChange(style.id)}
                  compact={compact}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Show more/less toggle */}
        {others.length > (compact ? 4 : 6) && (
          <button
            onClick={() => setShowAllStyles(!showAllStyles)}
            className="w-full py-2 text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
          >
            {showAllStyles ? (
              <>
                Show less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Show {others.length - (compact ? 4 : 6)} more styles <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Custom Prompt Section */}
      {onCustomPromptChange && (
        <div className="space-y-2 pt-2 border-t border-gray-700/50">
          <button
            onClick={() => setShowCustomPrompt(!showCustomPrompt)}
            className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Add custom instructions
            </span>
            {showCustomPrompt ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {showCustomPrompt && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-2">
                  <textarea
                    value={customPrompt}
                    onChange={(e) => handleCustomPromptChange(e.target.value)}
                    placeholder="Add custom details... e.g., 'Include a trophy icon' or 'Use darker colors'"
                    className="w-full h-20 px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 resize-none"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Describe additional elements or style tweaks
                    </span>
                    <span>{customPrompt.length}/500</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Selected Style Info */}
      <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0"
            style={{ background: getAIStyleConfig(selectedStyle).thumbnailGradient }}
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white">
              {getAIStyleConfig(selectedStyle).name}
            </h4>
            <p className="text-xs text-gray-400 line-clamp-2">
              {getAIStyleConfig(selectedStyle).description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIStyleSelector;
