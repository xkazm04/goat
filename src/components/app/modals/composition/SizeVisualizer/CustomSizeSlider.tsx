"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, ChevronDown, ChevronUp } from "lucide-react";
import { ListSize, SIZE_OPTIONS, getNearestSize } from "./types";

interface CustomSizeSliderProps {
  value: number;
  onChange: (value: number) => void;
  color: { primary: string; secondary: string; accent: string };
  min?: number;
  max?: number;
  step?: number;
  showPresets?: boolean;
  expanded?: boolean;
  onExpandToggle?: (expanded: boolean) => void;
}

/**
 * Custom Size Slider Component
 * Provides granular control over list size with preset snapping
 */
export const CustomSizeSlider = memo(function CustomSizeSlider({
  value,
  onChange,
  color,
  min = 5,
  max = 100,
  step = 5,
  showPresets = true,
  expanded: controlledExpanded,
  onExpandToggle,
}: CustomSizeSliderProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded = onExpandToggle ?? setInternalExpanded;

  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Preset sizes with their positions
  const presetPositions = SIZE_OPTIONS.map((opt) => ({
    value: opt.value,
    position: ((opt.value - min) / (max - min)) * 100,
    label: opt.label,
  }));

  // Current value position
  const valuePosition = ((value - min) / (max - min)) * 100;

  // Find nearest preset
  const nearestPreset = getNearestSize(value);
  const isOnPreset = SIZE_OPTIONS.some((opt) => opt.value === value);

  // Handle slider interaction
  const handleSliderInteraction = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      let newValue = Math.round((percentage * (max - min) + min) / step) * step;
      newValue = Math.max(min, Math.min(max, newValue));
      onChange(newValue);
    },
    [min, max, step, onChange]
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      handleSliderInteraction(e.clientX);
    },
    [handleSliderInteraction]
  );

  // Effect for mouse move/up during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleSliderInteraction(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleSliderInteraction]);

  // Snap to preset
  const snapToPreset = useCallback(
    (preset: ListSize) => {
      onChange(preset);
    },
    [onChange]
  );

  return (
    <div className="w-full">
      {/* Toggle button */}
      <motion.button
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer"
        style={{
          background: expanded ? `${color.primary}20` : "rgba(51, 65, 85, 0.3)",
          border: `1px solid ${expanded ? color.primary : "rgba(71, 85, 105, 0.3)"}40`,
        }}
        whileHover={{ background: `${color.primary}15` }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4" style={{ color: color.accent }} />
          <span className="text-sm text-slate-300">Custom Size</span>
        </div>
        <div className="flex items-center gap-2">
          {!isOnPreset && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: `${color.accent}20`,
                color: color.accent,
              }}
            >
              {value}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </motion.button>

      {/* Expanded slider section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-2 px-1">
              {/* Slider track */}
              <div
                ref={sliderRef}
                className="relative h-8 cursor-pointer"
                onMouseDown={handleMouseDown}
              >
                {/* Track background */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full"
                  style={{
                    background: "rgba(51, 65, 85, 0.6)",
                  }}
                />

                {/* Active track */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 left-0 h-2 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${color.primary}, ${color.accent})`,
                    width: `${valuePosition}%`,
                  }}
                  animate={{
                    width: `${valuePosition}%`,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />

                {/* Preset markers */}
                {showPresets &&
                  presetPositions.map((preset) => (
                    <motion.div
                      key={preset.value}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer"
                      style={{ left: `${preset.position}%` }}
                      whileHover={{ scale: 1.3 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        snapToPreset(preset.value);
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full border-2"
                        style={{
                          background:
                            value >= preset.value
                              ? color.accent
                              : "rgba(71, 85, 105, 0.6)",
                          borderColor:
                            value === preset.value
                              ? "white"
                              : value >= preset.value
                              ? color.primary
                              : "rgba(71, 85, 105, 0.3)",
                          boxShadow:
                            value === preset.value
                              ? `0 0 10px ${color.accent}60`
                              : "none",
                        }}
                      />
                    </motion.div>
                  ))}

                {/* Draggable thumb */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${valuePosition}%` }}
                  animate={{
                    left: `${valuePosition}%`,
                    scale: isDragging ? 1.2 : 1,
                  }}
                  transition={{
                    left: { type: "spring", stiffness: 300, damping: 30 },
                    scale: { duration: 0.1 },
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${color.primary}, ${color.accent})`,
                      boxShadow: `0 2px 10px ${color.primary}60`,
                    }}
                  />

                  {/* Value tooltip */}
                  <AnimatePresence>
                    {isDragging && (
                      <motion.div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap"
                        style={{
                          background: color.primary,
                        }}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                      >
                        {value}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Preset labels */}
              {showPresets && (
                <div className="relative h-6 mt-1">
                  {presetPositions.map((preset) => (
                    <motion.button
                      key={preset.value}
                      className="absolute -translate-x-1/2 text-xs cursor-pointer"
                      style={{
                        left: `${preset.position}%`,
                        color:
                          value === preset.value ? color.accent : "rgba(148, 163, 184, 0.6)",
                        fontWeight: value === preset.value ? 600 : 400,
                      }}
                      whileHover={{ color: color.accent }}
                      onClick={() => snapToPreset(preset.value)}
                    >
                      {preset.value}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Quick adjust buttons */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-1">
                  <motion.button
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: "rgba(51, 65, 85, 0.4)",
                      color: "rgba(148, 163, 184, 0.8)",
                    }}
                    whileHover={{
                      background: `${color.primary}30`,
                      color: "white",
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onChange(Math.max(min, value - step))}
                    disabled={value <= min}
                  >
                    - {step}
                  </motion.button>
                  <motion.button
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: "rgba(51, 65, 85, 0.4)",
                      color: "rgba(148, 163, 184, 0.8)",
                    }}
                    whileHover={{
                      background: `${color.primary}30`,
                      color: "white",
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onChange(Math.min(max, value + step))}
                    disabled={value >= max}
                  >
                    + {step}
                  </motion.button>
                </div>

                {/* Reset to nearest preset */}
                {!isOnPreset && (
                  <motion.button
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: `${color.accent}20`,
                      color: color.accent,
                    }}
                    whileHover={{
                      background: `${color.accent}30`,
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => snapToPreset(nearestPreset)}
                  >
                    Snap to {nearestPreset}
                  </motion.button>
                )}
              </div>

              {/* Custom value warning */}
              {!isOnPreset && (
                <motion.div
                  className="mt-3 p-2 rounded-lg text-xs"
                  style={{
                    background: "rgba(251, 191, 36, 0.1)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    color: "rgba(251, 191, 36, 0.8)",
                  }}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Custom size of {value}. Standard sizes may have better item availability.
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Compact number input for direct size entry
 */
export const SizeNumberInput = memo(function SizeNumberInput({
  value,
  onChange,
  color,
  min = 5,
  max = 100,
}: {
  value: number;
  onChange: (value: number) => void;
  color: { primary: string; secondary: string; accent: string };
  min?: number;
  max?: number;
}) {
  const [inputValue, setInputValue] = useState(String(value));

  const handleBlur = useCallback(() => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setInputValue(String(clamped));
    } else {
      setInputValue(String(value));
    }
  }, [inputValue, min, max, onChange, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleBlur();
      }
    },
    [handleBlur]
  );

  // Sync with external value changes
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400">Top</span>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-16 px-2 py-1 rounded-lg text-center text-sm font-medium bg-slate-800/50 border border-slate-700/50 text-white focus:outline-none focus:border-cyan-500/50"
        style={{
          background: "rgba(30, 41, 59, 0.5)",
          borderColor: `${color.primary}30`,
        }}
      />
    </div>
  );
});
