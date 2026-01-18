"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import {
  ListSize,
  RankingFormat,
  SizeVisualizerProps,
  SIZE_OPTIONS,
  getNearestSize,
  getExampleItems,
} from "./types";
import { GridPreview, MiniGridPreview } from "./GridPreview";
import { MorphAnimator, useMorphAnimation } from "./MorphAnimator";
import { TimeEstimator, TimeBadge } from "./TimeEstimator";
import { SizeRecommender, RecommendationBadge } from "./SizeRecommender";
import { CustomSizeSlider } from "./CustomSizeSlider";
import { FormatSwitcher, FormatBadge } from "./FormatSwitcher";

/**
 * Main Size Visualizer Component
 * Interactive preview display for list size selection
 */
export const SizeVisualizer = memo(function SizeVisualizer({
  selectedSize,
  onSizeChange,
  category,
  subcategory,
  color,
  showRecommendation = true,
  showTimeEstimate = true,
  showCustomSlider = true,
  showFormatSwitcher = false,
  compact = false,
}: SizeVisualizerProps) {
  const [selectedFormat, setSelectedFormat] = useState<RankingFormat>("standard");
  const [customSliderExpanded, setCustomSliderExpanded] = useState(false);
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  // Morph animation state
  const { currentSize, previousSize, isAnimating, changeSize, handleAnimationComplete } =
    useMorphAnimation(selectedSize as ListSize);

  // Get example items for the current category
  const exampleItems = useMemo(
    () => getExampleItems(category, Math.max(selectedSize, 100)),
    [category, selectedSize]
  );

  // Handle size selection
  const handleSizeSelect = useCallback(
    (size: ListSize | number) => {
      changeSize(size);
      onSizeChange(size);
    },
    [changeSize, onSizeChange]
  );

  // Is current size a standard preset?
  const isPresetSize = SIZE_OPTIONS.some((opt) => opt.value === selectedSize);

  // Get current size option
  const currentOption = useMemo(
    () => SIZE_OPTIONS.find((opt) => opt.value === selectedSize),
    [selectedSize]
  );

  if (compact) {
    return (
      <CompactSizeVisualizer
        selectedSize={selectedSize}
        onSizeChange={handleSizeSelect}
        category={category}
        color={color}
        showTimeEstimate={showTimeEstimate}
      />
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">
          List Size
        </label>
        {showTimeEstimate && (
          <TimeBadge size={selectedSize} category={category} color={color} />
        )}
      </div>

      {/* Main preview area */}
      <div
        className="relative p-6 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(30, 41, 59, 0.4))`,
          border: `1px solid ${color.primary}20`,
        }}
      >
        {/* Grid preview with morph animation */}
        <div className="flex items-center justify-center mb-6">
          <AnimatePresence mode="wait">
            {isAnimating ? (
              <MorphAnimator
                key="morph"
                fromSize={previousSize as ListSize}
                toSize={currentSize as ListSize}
                color={color}
                onComplete={handleAnimationComplete}
              />
            ) : (
              <motion.div
                key="static"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <GridPreview
                  size={currentSize as ListSize}
                  format={selectedFormat}
                  color={color}
                  showNumbers={selectedSize <= 25}
                  exampleItems={exampleItems}
                  interactive
                  onSlotHover={setHoveredSlot}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hovered slot info */}
          <AnimatePresence>
            {hoveredSlot && exampleItems[hoveredSlot - 1] && (
              <motion.div
                className="mt-4 p-2 rounded-lg text-center"
                style={{
                  background: `${color.primary}15`,
                  border: `1px solid ${color.primary}30`,
                }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <span className="text-[10px] text-slate-400 mr-1">#{hoveredSlot}:</span>
                <span className="text-xs font-medium" style={{ color: color.accent }}>
                  {exampleItems[hoveredSlot - 1]}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Size selection buttons */}
        <div
          className="grid grid-cols-5 gap-2"
          role="radiogroup"
          aria-label="Select list size"
        >
          {SIZE_OPTIONS.map((option, index) => {
            const isSelected = selectedSize === option.value;

            return (
              <motion.button
                key={option.value}
                className="relative p-3 rounded-xl cursor-pointer group"
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${color.primary}40, ${color.secondary}30)`
                    : "rgba(51, 65, 85, 0.3)",
                  border: `2px solid ${
                    isSelected ? color.primary : "rgba(71, 85, 105, 0.3)"
                  }60`,
                  boxShadow: isSelected
                    ? `0 8px 20px ${color.primary}25, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
                    : "none",
                }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: `0 10px 25px ${color.primary}20`,
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSizeSelect(option.value)}
                onKeyDown={(e) => {
                  // Arrow key navigation
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIndex = (index + 1) % SIZE_OPTIONS.length;
                    handleSizeSelect(SIZE_OPTIONS[nextIndex].value);
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevIndex = (index - 1 + SIZE_OPTIONS.length) % SIZE_OPTIONS.length;
                    handleSizeSelect(SIZE_OPTIONS[prevIndex].value);
                  }
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${option.label}: ${option.description}`}
                tabIndex={isSelected ? 0 : -1}
              >
                {/* Mini grid preview */}
                <div className="flex justify-center mb-2">
                  <MiniGridPreview
                    size={option.value}
                    color={color}
                    isActive={isSelected}
                  />
                </div>

                {/* Label */}
                <div
                  className={`text-sm font-bold text-center ${
                    isSelected ? "text-white" : "text-slate-300"
                  }`}
                >
                  {option.label}
                </div>

                {/* Description */}
                <div className="text-[10px] text-slate-400 text-center mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {option.description}
                </div>

                {/* Recommendation badge */}
                {showRecommendation && (
                  <div className="absolute -top-2 -right-2">
                    <RecommendationBadge
                      size={option.value}
                      category={category}
                      color={color}
                    />
                  </div>
                )}

                {/* Selection indicator */}
                <motion.div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${color.primary}, ${color.accent})`,
                    opacity: isSelected ? 1 : 0,
                  }}
                  animate={{
                    scaleX: isSelected ? 1 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
              </motion.button>
            );
          })}
        </div>

        {/* Current selection info */}
        {currentOption && (
          <motion.div
            className="mt-4 p-3 rounded-xl flex items-center justify-between"
            style={{
              background: `${color.primary}10`,
              border: `1px solid ${color.primary}20`,
            }}
            key={selectedSize}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <div className="text-sm font-medium text-white">
                {currentOption.label}
              </div>
              <div className="text-xs text-slate-400">
                {currentOption.description}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Best for</div>
              <div className="flex gap-1 mt-0.5">
                {currentOption.recommendedFor.slice(0, 2).map((rec, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `${color.accent}20`,
                      color: color.accent,
                    }}
                  >
                    {rec}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Recommendation panel */}
      {showRecommendation && category && (
        <SizeRecommender
          category={category}
          subcategory={subcategory}
          color={color}
          onSelectRecommended={handleSizeSelect}
        />
      )}

      {/* Time estimate panel */}
      {showTimeEstimate && (
        <TimeEstimator
          size={selectedSize}
          category={category}
          subcategory={subcategory}
          color={color}
          showFactors
        />
      )}

      {/* Custom size slider */}
      {showCustomSlider && (
        <CustomSizeSlider
          value={selectedSize}
          onChange={handleSizeSelect}
          color={color}
          expanded={customSliderExpanded}
          onExpandToggle={setCustomSliderExpanded}
        />
      )}

      {/* Format switcher */}
      {showFormatSwitcher && (
        <FormatSwitcher
          selectedFormat={selectedFormat}
          onFormatChange={setSelectedFormat}
          color={color}
        />
      )}

      {/* Comparison view toggle */}
      <motion.button
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer"
        style={{
          background: "rgba(51, 65, 85, 0.2)",
          border: "1px solid rgba(71, 85, 105, 0.2)",
        }}
        whileHover={{ background: `${color.primary}15` }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setShowComparisonView(!showComparisonView)}
      >
        <span className="text-xs text-slate-400">
          {showComparisonView ? "Hide" : "Show"} size comparison
        </span>
        <ChevronRight
          className={`w-4 h-4 text-slate-400 transition-transform ${
            showComparisonView ? "rotate-90" : ""
          }`}
        />
      </motion.button>

      {/* Comparison view */}
      <AnimatePresence>
        {showComparisonView && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <SizeComparisonView color={color} selectedSize={selectedSize} category={category} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Compact version of the size visualizer
 */
const CompactSizeVisualizer = memo(function CompactSizeVisualizer({
  selectedSize,
  onSizeChange,
  category,
  color,
  showTimeEstimate,
}: {
  selectedSize: ListSize | number;
  onSizeChange: (size: ListSize | number) => void;
  category?: string;
  color: { primary: string; secondary: string; accent: string };
  showTimeEstimate?: boolean;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-slate-300">List Size</label>
        {showTimeEstimate && (
          <TimeBadge size={selectedSize} category={category} color={color} />
        )}
      </div>

      <div className="flex gap-1">
        {SIZE_OPTIONS.slice(0, 4).map((option) => {
          const isSelected = selectedSize === option.value;

          return (
            <motion.button
              key={option.value}
              className="flex-1 py-3 rounded-xl cursor-pointer"
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${color.primary}40, ${color.secondary}30)`
                  : "rgba(51, 65, 85, 0.3)",
                border: `2px solid ${
                  isSelected ? color.primary : "rgba(71, 85, 105, 0.3)"
                }60`,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSizeChange(option.value)}
            >
              <div
                className={`text-sm font-bold text-center ${
                  isSelected ? "text-white" : "text-slate-400"
                }`}
              >
                {option.value}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Size comparison view
 */
const SizeComparisonView = memo(function SizeComparisonView({
  color,
  selectedSize,
  category,
}: {
  color: { primary: string; secondary: string; accent: string };
  selectedSize: ListSize | number;
  category?: string;
}) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "rgba(15, 23, 42, 0.4)",
        border: "1px solid rgba(71, 85, 105, 0.2)",
      }}
    >
      <div className="text-xs font-medium text-slate-400 mb-3">
        Compare all sizes
      </div>

      <div className="grid grid-cols-5 gap-4">
        {SIZE_OPTIONS.map((option) => {
          const isSelected = selectedSize === option.value;

          return (
            <div
              key={option.value}
              className={`text-center transition-opacity ${isSelected ? "opacity-100" : "opacity-50 hover:opacity-75"}`}
            >
              <GridPreview
                size={option.value}
                color={color}
                compact
                highlightedSlots={isSelected ? [1, 2, 3] : []}
              />
              <div className="mt-2 text-xs text-slate-400">{option.label}</div>
              <div className="text-[9px] text-slate-500">{option.description}</div>
            </div>
          );
        })}
      </div>

      {/* Quick stats comparison */}
      <div
        className="mt-4 pt-3 border-t border-slate-700/30"
      >
        <div className="grid grid-cols-5 gap-4 text-center">
          {SIZE_OPTIONS.map((option) => {
            const isSelected = selectedSize === option.value;
            const comparisons = Math.ceil(option.value * Math.log2(option.value) * 0.8);

            return (
              <div
                key={`stats-${option.value}`}
                className={`${isSelected ? "text-white" : "text-slate-500"}`}
              >
                <div className="text-[10px]">~{comparisons} choices</div>
                <div className="text-[10px]">~{option.estimatedMinutes}min</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default SizeVisualizer;
