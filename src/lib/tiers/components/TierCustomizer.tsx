"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Settings,
  Sliders,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Grip,
  Check,
  Eye,
  EyeOff,
  Layers,
  Tag,
  Minus,
} from "lucide-react";
import {
  TierDefinition,
  TierPreset,
  TierAlgorithm,
  TierSuggestion,
  TierConfiguration,
} from "../types";
import { TIER_PRESETS, TIER_COLORS } from "../constants";
import { TierLabelBadge } from "./TierVisualizer";

/**
 * Preset Selector Props
 */
interface PresetSelectorProps {
  presets: TierPreset[];
  selectedPreset: TierPreset;
  onSelect: (preset: TierPreset) => void;
  listSize: number;
}

/**
 * PresetSelector - Dropdown to select tier presets
 */
export const PresetSelector = memo(function PresetSelector({
  presets,
  selectedPreset,
  onSelect,
  listSize,
}: PresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredPresets = useMemo(() => {
    return presets.filter(
      (p) => listSize >= p.listSizeRange.min && listSize <= p.listSizeRange.max
    );
  }, [presets, listSize]);

  return (
    <div className="relative">
      <motion.button
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left"
        style={{
          background: "rgba(51, 65, 85, 0.4)",
          border: "1px solid rgba(71, 85, 105, 0.3)",
        }}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ background: "rgba(71, 85, 105, 0.5)" }}
      >
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-slate-400" />
          <div>
            <div className="text-sm font-medium text-white">
              {selectedPreset.name}
            </div>
            <div className="text-xs text-slate-500">
              {selectedPreset.tierCount} tiers • {selectedPreset.description}
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50"
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              border: "1px solid rgba(71, 85, 105, 0.4)",
              backdropFilter: "blur(12px)",
            }}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            {filteredPresets.map((preset) => (
              <motion.button
                key={preset.id}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  background:
                    preset.id === selectedPreset.id
                      ? "rgba(59, 130, 246, 0.2)"
                      : "transparent",
                }}
                whileHover={{ background: "rgba(71, 85, 105, 0.4)" }}
                onClick={() => {
                  onSelect(preset);
                  setIsOpen(false);
                }}
              >
                {/* Tier badges preview */}
                <div className="flex gap-1">
                  {preset.tiers.slice(0, 4).map((tier) => (
                    <TierLabelBadge key={tier.id} tier={tier} size="sm" />
                  ))}
                  {preset.tiers.length > 4 && (
                    <span className="text-xs text-slate-500 ml-1">
                      +{preset.tiers.length - 4}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-sm font-medium text-white">
                    {preset.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {preset.description}
                  </div>
                </div>

                {preset.id === selectedPreset.id && (
                  <Check className="w-4 h-4 text-blue-400" />
                )}
              </motion.button>
            ))}

            {filteredPresets.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                No presets available for {listSize} items
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Threshold Slider Props
 */
interface ThresholdSliderProps {
  tierAbove: TierDefinition;
  tierBelow: TierDefinition;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/**
 * ThresholdSlider - Draggable slider for adjusting tier boundaries
 */
export const ThresholdSlider = memo(function ThresholdSlider({
  tierAbove,
  tierBelow,
  value,
  min,
  max,
  onChange,
}: ThresholdSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TierLabelBadge tier={tierAbove} size="sm" />
          <span className="text-slate-500">→</span>
          <TierLabelBadge tier={tierBelow} size="sm" />
        </div>
        <span className="text-xs text-slate-400">Position #{value}</span>
      </div>

      <div className="relative h-8">
        {/* Track background */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${tierAbove.color.primary}40 ${percentage}%, ${tierBelow.color.primary}40 ${percentage}%)`,
          }}
        />

        {/* Active track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-2 rounded-full"
          style={{
            width: `${percentage}%`,
            background: tierAbove.color.gradient,
          }}
        />

        {/* Slider input */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* Thumb */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-lg cursor-grab active:cursor-grabbing"
          style={{
            left: `calc(${percentage}% - 12px)`,
            background: "white",
            border: `3px solid ${tierBelow.color.primary}`,
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        />
      </div>
    </div>
  );
});

/**
 * Algorithm Picker Props
 */
interface AlgorithmPickerProps {
  selected: TierAlgorithm;
  onSelect: (algorithm: TierAlgorithm) => void;
}

const ALGORITHM_OPTIONS: Array<{
  value: TierAlgorithm;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "equal",
    label: "Equal",
    description: "Balanced tier sizes",
    icon: <Minus className="w-4 h-4" />,
  },
  {
    value: "pyramid",
    label: "Pyramid",
    description: "Fewer at top",
    icon: <ChevronUp className="w-4 h-4" />,
  },
  {
    value: "bell",
    label: "Bell Curve",
    description: "Most in middle",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 18c0-6 4-12 9-12s9 6 9 12" strokeWidth={2} />
      </svg>
    ),
  },
  {
    value: "kmeans",
    label: "Smart",
    description: "AI clustering",
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    value: "percentile",
    label: "Percentile",
    description: "Top % based",
    icon: <Tag className="w-4 h-4" />,
  },
];

/**
 * AlgorithmPicker - Select tier calculation algorithm
 */
export const AlgorithmPicker = memo(function AlgorithmPicker({
  selected,
  onSelect,
}: AlgorithmPickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {ALGORITHM_OPTIONS.map((option) => (
        <motion.button
          key={option.value}
          className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
          style={{
            background:
              selected === option.value
                ? "rgba(59, 130, 246, 0.2)"
                : "rgba(51, 65, 85, 0.3)",
            border:
              selected === option.value
                ? "1px solid rgba(59, 130, 246, 0.5)"
                : "1px solid rgba(71, 85, 105, 0.2)",
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(option.value)}
        >
          <div
            className={`p-2 rounded-lg ${
              selected === option.value
                ? "bg-blue-500/20 text-blue-400"
                : "bg-slate-700/50 text-slate-400"
            }`}
          >
            {option.icon}
          </div>
          <span
            className={`text-xs font-medium ${
              selected === option.value ? "text-white" : "text-slate-400"
            }`}
          >
            {option.label}
          </span>
          <span className="text-[10px] text-slate-500">{option.description}</span>
        </motion.button>
      ))}
    </div>
  );
});

/**
 * Suggestion Card Props
 */
interface SuggestionCardProps {
  suggestion: TierSuggestion;
  onApply: () => void;
  isApplied?: boolean;
}

/**
 * SuggestionCard - Display ML tier suggestion
 */
export const SuggestionCard = memo(function SuggestionCard({
  suggestion,
  onApply,
  isApplied = false,
}: SuggestionCardProps) {
  return (
    <motion.div
      className="p-4 rounded-xl"
      style={{
        background: isApplied
          ? "rgba(34, 197, 94, 0.1)"
          : "rgba(51, 65, 85, 0.4)",
        border: isApplied
          ? "1px solid rgba(34, 197, 94, 0.3)"
          : "1px solid rgba(71, 85, 105, 0.3)",
      }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg"
          style={{
            background: isApplied
              ? "rgba(34, 197, 94, 0.2)"
              : "rgba(139, 92, 246, 0.2)",
          }}
        >
          <Sparkles
            className={`w-5 h-5 ${
              isApplied ? "text-green-400" : "text-purple-400"
            }`}
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white capitalize">
              {suggestion.algorithm} Algorithm
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: `rgba(${
                  suggestion.confidence > 80
                    ? "34, 197, 94"
                    : suggestion.confidence > 60
                    ? "234, 179, 8"
                    : "239, 68, 68"
                }, 0.2)`,
                color:
                  suggestion.confidence > 80
                    ? "#22c55e"
                    : suggestion.confidence > 60
                    ? "#eab308"
                    : "#ef4444",
              }}
            >
              {suggestion.confidence}% confidence
            </span>
          </div>
          <p className="text-xs text-slate-400">{suggestion.reasoning}</p>

          {/* Boundary preview */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {suggestion.boundaries.slice(1, -1).map((boundary, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400"
              >
                #{boundary}
              </span>
            ))}
          </div>
        </div>

        <motion.button
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: isApplied
              ? "rgba(34, 197, 94, 0.2)"
              : "rgba(59, 130, 246, 0.2)",
            color: isApplied ? "#22c55e" : "#3b82f6",
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onApply}
        >
          {isApplied ? "Applied" : "Apply"}
        </motion.button>
      </div>
    </motion.div>
  );
});

/**
 * Display Options Props
 */
interface DisplayOptionsProps {
  showBands: boolean;
  showLabels: boolean;
  showSeparators: boolean;
  onToggleBands: () => void;
  onToggleLabels: () => void;
  onToggleSeparators: () => void;
}

/**
 * DisplayOptions - Toggle tier display options
 */
export const DisplayOptions = memo(function DisplayOptions({
  showBands,
  showLabels,
  showSeparators,
  onToggleBands,
  onToggleLabels,
  onToggleSeparators,
}: DisplayOptionsProps) {
  const options = [
    {
      label: "Tier Bands",
      description: "Background colors",
      enabled: showBands,
      onToggle: onToggleBands,
    },
    {
      label: "Tier Labels",
      description: "S, A, B badges",
      enabled: showLabels,
      onToggle: onToggleLabels,
    },
    {
      label: "Separators",
      description: "Divider lines",
      enabled: showSeparators,
      onToggle: onToggleSeparators,
    },
  ];

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <motion.button
          key={option.label}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
          style={{
            background: option.enabled
              ? "rgba(59, 130, 246, 0.1)"
              : "rgba(51, 65, 85, 0.3)",
            border: option.enabled
              ? "1px solid rgba(59, 130, 246, 0.3)"
              : "1px solid rgba(71, 85, 105, 0.2)",
          }}
          whileHover={{ background: "rgba(71, 85, 105, 0.4)" }}
          onClick={option.onToggle}
        >
          <div className="flex items-center gap-3">
            {option.enabled ? (
              <Eye className="w-4 h-4 text-blue-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-500" />
            )}
            <div className="text-left">
              <div className="text-sm font-medium text-white">
                {option.label}
              </div>
              <div className="text-xs text-slate-500">{option.description}</div>
            </div>
          </div>
          <div
            className={`w-10 h-6 rounded-full p-1 transition-colors ${
              option.enabled ? "bg-blue-500" : "bg-slate-600"
            }`}
          >
            <motion.div
              className="w-4 h-4 rounded-full bg-white"
              animate={{ x: option.enabled ? 16 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </motion.button>
      ))}
    </div>
  );
});

/**
 * Main TierCustomizer Props
 */
interface TierCustomizerProps {
  configuration: TierConfiguration;
  listSize: number;
  tiers: TierDefinition[];
  suggestions: TierSuggestion[];
  onPresetChange: (preset: TierPreset) => void;
  onThresholdChange: (index: number, value: number) => void;
  onAlgorithmChange: (algorithm: TierAlgorithm) => void;
  onApplySuggestion: (suggestion: TierSuggestion) => void;
  onToggleBands: () => void;
  onToggleLabels: () => void;
  onToggleSeparators: () => void;
  onReset: () => void;
}

/**
 * TierCustomizer - Main customization panel
 */
export const TierCustomizer = memo(function TierCustomizer({
  configuration,
  listSize,
  tiers,
  suggestions,
  onPresetChange,
  onThresholdChange,
  onAlgorithmChange,
  onApplySuggestion,
  onToggleBands,
  onToggleLabels,
  onToggleSeparators,
  onReset,
}: TierCustomizerProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("preset");

  const sections = [
    { id: "preset", label: "Preset", icon: <Layers className="w-4 h-4" /> },
    { id: "algorithm", label: "Algorithm", icon: <Sparkles className="w-4 h-4" /> },
    { id: "thresholds", label: "Thresholds", icon: <Sliders className="w-4 h-4" /> },
    { id: "display", label: "Display", icon: <Eye className="w-4 h-4" /> },
    { id: "suggestions", label: "AI Suggestions", icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-white">Tier Settings</h3>
        </div>
        <motion.button
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400"
          style={{ background: "rgba(51, 65, 85, 0.4)" }}
          whileHover={{ background: "rgba(71, 85, 105, 0.5)" }}
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </motion.button>
      </div>

      {/* Accordion sections */}
      {sections.map((section) => (
        <div key={section.id}>
          <motion.button
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
            style={{
              background:
                expandedSection === section.id
                  ? "rgba(59, 130, 246, 0.1)"
                  : "rgba(51, 65, 85, 0.3)",
              border:
                expandedSection === section.id
                  ? "1px solid rgba(59, 130, 246, 0.3)"
                  : "1px solid rgba(71, 85, 105, 0.2)",
            }}
            onClick={() =>
              setExpandedSection(
                expandedSection === section.id ? null : section.id
              )
            }
          >
            <div className="flex items-center gap-2">
              <span
                className={
                  expandedSection === section.id
                    ? "text-blue-400"
                    : "text-slate-400"
                }
              >
                {section.icon}
              </span>
              <span
                className={`text-sm font-medium ${
                  expandedSection === section.id
                    ? "text-white"
                    : "text-slate-400"
                }`}
              >
                {section.label}
              </span>
            </div>
            <motion.div
              animate={{ rotate: expandedSection === section.id ? 180 : 0 }}
            >
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {expandedSection === section.id && (
              <motion.div
                className="mt-2 px-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {section.id === "preset" && (
                  <PresetSelector
                    presets={TIER_PRESETS}
                    selectedPreset={configuration.preset}
                    onSelect={onPresetChange}
                    listSize={listSize}
                  />
                )}

                {section.id === "algorithm" && (
                  <AlgorithmPicker
                    selected="pyramid"
                    onSelect={onAlgorithmChange}
                  />
                )}

                {section.id === "thresholds" && (
                  <div className="space-y-2">
                    {tiers.slice(0, -1).map((tier, index) => (
                      <ThresholdSlider
                        key={tier.id}
                        tierAbove={tier}
                        tierBelow={tiers[index + 1]}
                        value={tier.endPosition}
                        min={tier.startPosition + 1}
                        max={tiers[index + 1].endPosition - 1}
                        onChange={(value) => onThresholdChange(index, value)}
                      />
                    ))}
                  </div>
                )}

                {section.id === "display" && (
                  <DisplayOptions
                    showBands={configuration.showBands}
                    showLabels={configuration.showLabels}
                    showSeparators={configuration.showSeparators}
                    onToggleBands={onToggleBands}
                    onToggleLabels={onToggleLabels}
                    onToggleSeparators={onToggleSeparators}
                  />
                )}

                {section.id === "suggestions" && (
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <SuggestionCard
                        key={index}
                        suggestion={suggestion}
                        onApply={() => onApplySuggestion(suggestion)}
                      />
                    ))}
                    {suggestions.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No suggestions available yet
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
});

export default TierCustomizer;
