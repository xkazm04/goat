"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Target, Award } from "lucide-react";
import { ListSize, SizeRecommendation, SIZE_OPTIONS } from "./types";

interface SizeRecommenderProps {
  category?: string;
  subcategory?: string;
  color: { primary: string; secondary: string; accent: string };
  onSelectRecommended?: (size: ListSize) => void;
  compact?: boolean;
}

/**
 * Category-based size recommendations
 */
const CATEGORY_RECOMMENDATIONS: Record<
  string,
  {
    recommended: ListSize;
    reason: string;
    confidence: number;
  }
> = {
  Movies: {
    recommended: 25,
    reason: "Perfect for essential films plus honorable mentions",
    confidence: 85,
  },
  Music: {
    recommended: 50,
    reason: "Music catalogs benefit from deeper exploration",
    confidence: 80,
  },
  Games: {
    recommended: 25,
    reason: "Balances classic and modern titles well",
    confidence: 82,
  },
  Sports: {
    recommended: 10,
    reason: "Debates are fiercest with tight lists",
    confidence: 90,
  },
  Television: {
    recommended: 20,
    reason: "Enough for different eras and genres",
    confidence: 78,
  },
  Food: {
    recommended: 10,
    reason: "Quick and shareable rankings",
    confidence: 88,
  },
  Art: {
    recommended: 50,
    reason: "Art appreciation needs breadth",
    confidence: 75,
  },
  Technology: {
    recommended: 20,
    reason: "Balance innovation eras",
    confidence: 80,
  },
  Fashion: {
    recommended: 25,
    reason: "Covers diverse styles and decades",
    confidence: 77,
  },
  Travel: {
    recommended: 25,
    reason: "Enough for varied experiences",
    confidence: 79,
  },
  Stories: {
    recommended: 50,
    reason: "Literature deserves deep exploration",
    confidence: 76,
  },
};

/**
 * Sports subcategory recommendations
 */
const SPORTS_SUBCATEGORY_RECOMMENDATIONS: Record<
  string,
  {
    recommended: ListSize;
    reason: string;
  }
> = {
  Basketball: {
    recommended: 10,
    reason: "NBA debates focus on the greatest",
  },
  Football: {
    recommended: 10,
    reason: "NFL/Football legends are well-defined",
  },
  Soccer: {
    recommended: 25,
    reason: "Global talent needs more slots",
  },
  Baseball: {
    recommended: 25,
    reason: "Rich history across eras",
  },
  Tennis: {
    recommended: 10,
    reason: "Clear tier of all-time greats",
  },
  Golf: {
    recommended: 10,
    reason: "Majors winners form the core",
  },
};

/**
 * Calculate size recommendation
 */
function calculateRecommendation(
  category?: string,
  subcategory?: string
): SizeRecommendation {
  let recommendation = CATEGORY_RECOMMENDATIONS[category || ""] || {
    recommended: 20 as ListSize,
    reason: "Good balance of depth and effort",
    confidence: 70,
  };

  // Check for subcategory overrides
  if (category === "Sports" && subcategory) {
    const subRec = SPORTS_SUBCATEGORY_RECOMMENDATIONS[subcategory];
    if (subRec) {
      recommendation = {
        ...subRec,
        confidence: 85,
      };
    }
  }

  // Generate alternatives
  const alternatives: Array<{ size: ListSize; reason: string }> = [];

  const sizes: ListSize[] = [10, 20, 25, 50, 100];
  const recIndex = sizes.indexOf(recommendation.recommended);

  // Add smaller alternative
  if (recIndex > 0) {
    const smallerSize = sizes[recIndex - 1];
    alternatives.push({
      size: smallerSize,
      reason: smallerSize === 10 ? "For quick, shareable rankings" : "For tighter curation",
    });
  }

  // Add larger alternative
  if (recIndex < sizes.length - 1) {
    const largerSize = sizes[recIndex + 1];
    alternatives.push({
      size: largerSize,
      reason:
        largerSize === 100
          ? "For the ultimate definitive guide"
          : "For more comprehensive coverage",
    });
  }

  return {
    recommended: recommendation.recommended,
    confidence: recommendation.confidence,
    reason: recommendation.reason,
    alternatives,
  };
}

/**
 * Size Recommender Component
 * Provides smart size suggestions based on category
 */
export const SizeRecommender = memo(function SizeRecommender({
  category,
  subcategory,
  color,
  onSelectRecommended,
  compact = false,
}: SizeRecommenderProps) {
  const recommendation = useMemo(
    () => calculateRecommendation(category, subcategory),
    [category, subcategory]
  );

  const sizeOption = SIZE_OPTIONS.find(
    (opt) => opt.value === recommendation.recommended
  );

  if (compact) {
    return (
      <motion.button
        className="flex items-center gap-1.5 px-2 py-1 rounded-full cursor-pointer"
        style={{
          background: `${color.accent}20`,
          border: `1px solid ${color.accent}40`,
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelectRecommended?.(recommendation.recommended)}
      >
        <Sparkles className="w-3 h-3" style={{ color: color.accent }} />
        <span className="text-xs font-medium" style={{ color: color.accent }}>
          Top {recommendation.recommended} recommended
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(15, 23, 42, 0.5)",
        border: `1px solid ${color.accent}30`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{
          background: `linear-gradient(135deg, ${color.accent}20, ${color.primary}10)`,
          borderBottom: `1px solid ${color.accent}20`,
        }}
      >
        <Sparkles className="w-4 h-4" style={{ color: color.accent }} />
        <span className="text-sm font-medium text-white">
          Recommended for {category || "You"}
        </span>
        {subcategory && (
          <span className="text-xs text-slate-400">• {subcategory}</span>
        )}
      </div>

      {/* Main recommendation */}
      <div className="p-4">
        <motion.button
          className="w-full p-4 rounded-xl cursor-pointer relative overflow-hidden group"
          style={{
            background: `linear-gradient(135deg, ${color.primary}30, ${color.secondary}20)`,
            border: `2px solid ${color.accent}60`,
          }}
          whileHover={{
            scale: 1.02,
            boxShadow: `0 8px 25px ${color.accent}30`,
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectRecommended?.(recommendation.recommended)}
        >
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100"
            style={{
              background: `linear-gradient(90deg, transparent, ${color.accent}20, transparent)`,
            }}
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />

          <div className="relative flex items-center justify-between">
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-5 h-5" style={{ color: color.accent }} />
                <span className="text-2xl font-bold text-white">
                  Top {recommendation.recommended}
                </span>
              </div>
              <p className="text-sm text-slate-300">{recommendation.reason}</p>
            </div>

            {/* Confidence indicator */}
            <div className="text-right">
              <div
                className="text-lg font-bold"
                style={{ color: color.accent }}
              >
                {recommendation.confidence}%
              </div>
              <div className="text-xs text-slate-400">match</div>
            </div>
          </div>

          {/* Use button */}
          <div
            className="mt-3 py-2 rounded-lg text-center text-sm font-medium"
            style={{
              background: `${color.accent}30`,
              color: color.accent,
            }}
          >
            Use This Size
          </div>
        </motion.button>

        {/* Alternatives */}
        {recommendation.alternatives.length > 0 && (
          <div className="mt-4">
            <span className="text-xs text-slate-400 block mb-2">
              Alternatives:
            </span>
            <div className="flex gap-2">
              {recommendation.alternatives.map((alt) => (
                <motion.button
                  key={alt.size}
                  className="flex-1 p-3 rounded-lg cursor-pointer"
                  style={{
                    background: "rgba(51, 65, 85, 0.4)",
                    border: "1px solid rgba(71, 85, 105, 0.3)",
                  }}
                  whileHover={{
                    background: `${color.primary}20`,
                    borderColor: `${color.primary}40`,
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectRecommended?.(alt.size)}
                >
                  <div className="text-sm font-medium text-white mb-0.5">
                    Top {alt.size}
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-1">
                    {alt.reason}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with best for */}
      {sizeOption && (
        <div
          className="px-4 py-3"
          style={{
            background: "rgba(15, 23, 42, 0.3)",
            borderTop: "1px solid rgba(71, 85, 105, 0.2)",
          }}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Target className="w-3 h-3" />
            <span>Best for:</span>
            <div className="flex gap-1">
              {sizeOption.recommendedFor.slice(0, 2).map((rec, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    background: `${color.primary}20`,
                    color: color.accent,
                  }}
                >
                  {rec}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});

/**
 * Recommendation badge for inline display
 */
export const RecommendationBadge = memo(function RecommendationBadge({
  size,
  category,
  color,
}: {
  size: ListSize;
  category?: string;
  color: { primary: string; secondary: string; accent: string };
}) {
  const recommendation = useMemo(
    () => calculateRecommendation(category),
    [category]
  );

  if (size !== recommendation.recommended) return null;

  return (
    <motion.div
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]"
      style={{
        background: `${color.accent}20`,
        border: `1px solid ${color.accent}40`,
        color: color.accent,
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <Sparkles className="w-2.5 h-2.5" />
      <span>Recommended</span>
    </motion.div>
  );
});
