"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Contrast,
  Droplets,
  Sparkles,
  RotateCcw,
  Download,
  X,
  Check,
  Crop,
  Palette,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageFilter } from "../lib/ai/types";

export interface ImageEditorProps {
  /** Image URL to edit */
  imageUrl: string;
  /** Called when edits are applied */
  onApply: (editedImageUrl: string) => void;
  /** Called when editor is cancelled */
  onCancel: () => void;
  /** Whether the editor is visible */
  isOpen: boolean;
}

interface AdjustmentSliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function AdjustmentSlider({
  label,
  icon,
  value,
  onChange,
  min = -100,
  max = 100,
  step = 1,
}: AdjustmentSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-gray-400">
          {icon}
          {label}
        </span>
        <span className="text-gray-500 font-mono w-10 text-right">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-cyan-500
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-3.5
          [&::-moz-range-thumb]:h-3.5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-cyan-500
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  );
}

const FILTERS: { id: ImageFilter; name: string; cssFilter: string }[] = [
  { id: 'none', name: 'None', cssFilter: 'none' },
  { id: 'grayscale', name: 'B&W', cssFilter: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', cssFilter: 'sepia(80%)' },
  { id: 'warm', name: 'Warm', cssFilter: 'sepia(30%) saturate(130%)' },
  { id: 'cool', name: 'Cool', cssFilter: 'hue-rotate(180deg) saturate(80%)' },
  { id: 'vintage', name: 'Vintage', cssFilter: 'sepia(40%) contrast(90%) brightness(90%)' },
  { id: 'dramatic', name: 'Dramatic', cssFilter: 'contrast(130%) saturate(110%)' },
  { id: 'vivid', name: 'Vivid', cssFilter: 'saturate(150%) contrast(110%)' },
];

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  filter: ImageFilter;
}

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  filter: 'none',
};

/**
 * ImageEditor - Post-generation editing tools
 *
 * Features:
 * - Brightness, contrast, saturation adjustments
 * - Preset filters (grayscale, sepia, warm, cool, etc.)
 * - Real-time preview
 * - Reset to original
 * - Export edited image
 */
export function ImageEditor({
  imageUrl,
  onApply,
  onCancel,
  isOpen,
}: ImageEditorProps) {
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [activeTab, setActiveTab] = useState<'adjust' | 'filters'>('adjust');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset adjustments when editor opens
  useEffect(() => {
    if (isOpen) {
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setActiveTab('adjust');
    }
  }, [isOpen]);

  // Build CSS filter string from adjustments
  const getCssFilter = useCallback(() => {
    const parts: string[] = [];

    // Base adjustments
    if (adjustments.brightness !== 0) {
      parts.push(`brightness(${100 + adjustments.brightness}%)`);
    }
    if (adjustments.contrast !== 0) {
      parts.push(`contrast(${100 + adjustments.contrast}%)`);
    }
    if (adjustments.saturation !== 0) {
      parts.push(`saturate(${100 + adjustments.saturation}%)`);
    }

    // Preset filter
    const presetFilter = FILTERS.find(f => f.id === adjustments.filter);
    if (presetFilter && presetFilter.cssFilter !== 'none') {
      parts.push(presetFilter.cssFilter);
    }

    return parts.length > 0 ? parts.join(' ') : 'none';
  }, [adjustments]);

  // Update a single adjustment
  const updateAdjustment = useCallback(<K extends keyof Adjustments>(
    key: K,
    value: Adjustments[K]
  ) => {
    setAdjustments(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset all adjustments
  const handleReset = useCallback(() => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
  }, []);

  // Check if any adjustments have been made
  const hasChanges = adjustments.brightness !== 0 ||
    adjustments.contrast !== 0 ||
    adjustments.saturation !== 0 ||
    adjustments.filter !== 'none';

  // Apply edits and export
  const handleApply = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const img = imageRef.current;

      // Set canvas size to image size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Apply filter
      ctx.filter = getCssFilter();

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Export as data URL
      const editedUrl = canvas.toDataURL('image/png');
      onApply(editedUrl);
    } catch (error) {
      console.error('Failed to apply edits:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [getCssFilter, onApply]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Edit Image</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={!hasChanges}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  hasChanges
                    ? "text-gray-300 hover:text-white hover:bg-gray-800"
                    : "text-gray-600 cursor-not-allowed"
                )}
                title="Reset to original"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={onCancel}
                className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Image preview */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <div className="relative max-w-full max-h-full">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Edit preview"
                  className="max-w-full max-h-[60vh] md:max-h-[70vh] rounded-lg shadow-2xl"
                  style={{ filter: getCssFilter() }}
                  crossOrigin="anonymous"
                />
                {/* Hidden canvas for export */}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            {/* Controls sidebar */}
            <div className="w-full md:w-80 bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 flex flex-col">
              {/* Tab switcher */}
              <div className="flex border-b border-gray-800">
                <button
                  onClick={() => setActiveTab('adjust')}
                  className={cn(
                    "flex-1 py-3 text-sm font-medium transition-colors",
                    activeTab === 'adjust'
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4" />
                    Adjust
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('filters')}
                  className={cn(
                    "flex-1 py-3 text-sm font-medium transition-colors",
                    activeTab === 'filters'
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Palette className="w-4 h-4" />
                    Filters
                  </span>
                </button>
              </div>

              {/* Controls content */}
              <div className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                  {activeTab === 'adjust' && (
                    <motion.div
                      key="adjust"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-5"
                    >
                      <AdjustmentSlider
                        label="Brightness"
                        icon={<Sun className="w-3.5 h-3.5" />}
                        value={adjustments.brightness}
                        onChange={(v) => updateAdjustment('brightness', v)}
                      />
                      <AdjustmentSlider
                        label="Contrast"
                        icon={<Contrast className="w-3.5 h-3.5" />}
                        value={adjustments.contrast}
                        onChange={(v) => updateAdjustment('contrast', v)}
                      />
                      <AdjustmentSlider
                        label="Saturation"
                        icon={<Droplets className="w-3.5 h-3.5" />}
                        value={adjustments.saturation}
                        onChange={(v) => updateAdjustment('saturation', v)}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'filters' && (
                    <motion.div
                      key="filters"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="grid grid-cols-2 gap-2"
                    >
                      {FILTERS.map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => updateAdjustment('filter', filter.id)}
                          className={cn(
                            "relative aspect-square rounded-lg overflow-hidden transition-all",
                            adjustments.filter === filter.id
                              ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900"
                              : "ring-1 ring-gray-700 hover:ring-gray-500"
                          )}
                        >
                          <img
                            src={imageUrl}
                            alt={filter.name}
                            className="w-full h-full object-cover"
                            style={{ filter: filter.cssFilter }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                            <span className="text-[10px] font-medium text-white">
                              {filter.name}
                            </span>
                          </div>
                          {adjustments.filter === filter.id && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-gray-800 space-y-2">
                <button
                  onClick={handleApply}
                  disabled={isProcessing}
                  className={cn(
                    "w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all",
                    isProcessing
                      ? "bg-gray-700 text-gray-400 cursor-wait"
                      : "bg-cyan-500 hover:bg-cyan-400 text-gray-900"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Apply Changes
                    </>
                  )}
                </button>
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ImageEditor;
