"use client";

import { memo, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Image,
  Share2,
  Copy,
  Check,
  Loader2,
  Settings,
  Palette,
  Layout,
  Type,
  Hash,
} from "lucide-react";
import {
  TierDefinition,
  TieredItem,
  TierExportConfig,
} from "../types";
import { TierLabelBadge } from "./TierVisualizer";

/**
 * Default export configuration
 */
const DEFAULT_EXPORT_CONFIG: TierExportConfig = {
  format: "png",
  width: 1200,
  height: 800,
  showTierLabels: true,
  showRankNumbers: true,
  showItemImages: true,
  showItemTitles: true,
  backgroundColor: "#1e293b",
  quality: 0.92,
};

/**
 * Export Format Option
 */
interface FormatOptionProps {
  format: "png" | "jpg" | "svg";
  isSelected: boolean;
  onSelect: () => void;
}

const FormatOption = memo(function FormatOption({
  format,
  isSelected,
  onSelect,
}: FormatOptionProps) {
  const labels = {
    png: { name: "PNG", desc: "Best quality" },
    jpg: { name: "JPG", desc: "Smaller size" },
    svg: { name: "SVG", desc: "Scalable" },
  };

  return (
    <motion.button
      className="flex flex-col items-center p-3 rounded-xl transition-all"
      style={{
        background: isSelected
          ? "rgba(59, 130, 246, 0.2)"
          : "rgba(51, 65, 85, 0.3)",
        border: isSelected
          ? "1px solid rgba(59, 130, 246, 0.5)"
          : "1px solid rgba(71, 85, 105, 0.2)",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
    >
      <span
        className={`text-sm font-bold ${
          isSelected ? "text-blue-400" : "text-slate-400"
        }`}
      >
        {labels[format].name}
      </span>
      <span className="text-[10px] text-slate-500">{labels[format].desc}</span>
    </motion.button>
  );
});

/**
 * Size Presets
 */
const SIZE_PRESETS = [
  { label: "Instagram", width: 1080, height: 1080 },
  { label: "Twitter", width: 1200, height: 675 },
  { label: "Standard", width: 1200, height: 800 },
  { label: "Wide", width: 1920, height: 1080 },
] as const;

/**
 * Export Settings Panel Props
 */
interface ExportSettingsProps {
  config: TierExportConfig;
  onChange: (config: Partial<TierExportConfig>) => void;
}

/**
 * ExportSettings - Configuration panel for export options
 */
const ExportSettings = memo(function ExportSettings({
  config,
  onChange,
}: ExportSettingsProps) {
  return (
    <div className="space-y-4">
      {/* Format selection */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Format</label>
        <div className="grid grid-cols-3 gap-2">
          {(["png", "jpg", "svg"] as const).map((format) => (
            <FormatOption
              key={format}
              format={format}
              isSelected={config.format === format}
              onSelect={() => onChange({ format })}
            />
          ))}
        </div>
      </div>

      {/* Size presets */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Size</label>
        <div className="grid grid-cols-2 gap-2">
          {SIZE_PRESETS.map((preset) => (
            <motion.button
              key={preset.label}
              className="p-2 rounded-lg text-left transition-all"
              style={{
                background:
                  config.width === preset.width && config.height === preset.height
                    ? "rgba(59, 130, 246, 0.2)"
                    : "rgba(51, 65, 85, 0.3)",
                border:
                  config.width === preset.width && config.height === preset.height
                    ? "1px solid rgba(59, 130, 246, 0.5)"
                    : "1px solid rgba(71, 85, 105, 0.2)",
              }}
              whileHover={{ background: "rgba(71, 85, 105, 0.4)" }}
              onClick={() =>
                onChange({ width: preset.width, height: preset.height })
              }
            >
              <span className="text-xs font-medium text-white">
                {preset.label}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {preset.width}×{preset.height}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Display options */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Display</label>
        <div className="space-y-2">
          {[
            { key: "showTierLabels", label: "Tier Labels", icon: <Type className="w-4 h-4" /> },
            { key: "showRankNumbers", label: "Rank Numbers", icon: <Hash className="w-4 h-4" /> },
            { key: "showItemImages", label: "Item Images", icon: <Image className="w-4 h-4" /> },
            { key: "showItemTitles", label: "Item Titles", icon: <Type className="w-4 h-4" /> },
          ].map((option) => (
            <motion.button
              key={option.key}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg"
              style={{
                background: config[option.key as keyof TierExportConfig]
                  ? "rgba(59, 130, 246, 0.1)"
                  : "rgba(51, 65, 85, 0.3)",
              }}
              onClick={() =>
                onChange({
                  [option.key]: !config[option.key as keyof TierExportConfig],
                } as Partial<TierExportConfig>)
              }
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{option.icon}</span>
                <span className="text-sm text-white">{option.label}</span>
              </div>
              <div
                className={`w-8 h-5 rounded-full p-0.5 transition-colors ${
                  config[option.key as keyof TierExportConfig]
                    ? "bg-blue-500"
                    : "bg-slate-600"
                }`}
              >
                <motion.div
                  className="w-4 h-4 rounded-full bg-white"
                  animate={{
                    x: config[option.key as keyof TierExportConfig] ? 12 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Background color */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Background</label>
        <div className="flex gap-2">
          {[
            { color: "#1e293b", label: "Dark" },
            { color: "#0f172a", label: "Darker" },
            { color: "#111827", label: "Gray" },
            { color: "#18181b", label: "Black" },
            { color: "#ffffff", label: "White" },
          ].map((bg) => (
            <motion.button
              key={bg.color}
              className="w-10 h-10 rounded-lg transition-all"
              style={{
                background: bg.color,
                border:
                  config.backgroundColor === bg.color
                    ? "2px solid #3b82f6"
                    : "1px solid rgba(71, 85, 105, 0.3)",
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange({ backgroundColor: bg.color })}
              title={bg.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

/**
 * Canvas Tier Item Props
 */
interface TierItemData {
  itemId: string;
  title?: string;
  imageUrl?: string;
  position: number;
  tier: TierDefinition;
}

/**
 * Generate tier list image using Canvas
 */
async function generateTierListImage(
  tiers: TierDefinition[],
  items: TierItemData[],
  config: TierExportConfig
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, config.width, config.height);

  // Calculate layout
  const padding = 40;
  const tierLabelWidth = config.showTierLabels ? 80 : 0;
  const rowHeight = (config.height - padding * 2) / tiers.length;
  const itemSize = Math.min(rowHeight - 20, 80);

  // Draw each tier row
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const y = padding + i * rowHeight;

    // Tier background band
    ctx.fillStyle = `${tier.color.primary}20`;
    ctx.fillRect(padding, y, config.width - padding * 2, rowHeight - 10);

    // Tier label
    if (config.showTierLabels) {
      const gradient = ctx.createLinearGradient(
        padding,
        y,
        padding + tierLabelWidth,
        y + rowHeight
      );
      gradient.addColorStop(0, tier.color.primary);
      gradient.addColorStop(1, tier.color.secondary);
      ctx.fillStyle = gradient;
      ctx.fillRect(padding, y, tierLabelWidth - 10, rowHeight - 10);

      // Tier label text
      ctx.fillStyle = tier.color.text;
      ctx.font = "bold 32px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        tier.label,
        padding + (tierLabelWidth - 10) / 2,
        y + (rowHeight - 10) / 2
      );
    }

    // Items in this tier
    const tierItems = items.filter(
      (item) =>
        item.position >= tier.startPosition && item.position < tier.endPosition
    );

    const startX = padding + tierLabelWidth + 10;
    const availableWidth = config.width - startX - padding;
    const maxItemsPerRow = Math.floor(availableWidth / (itemSize + 10));

    for (let j = 0; j < tierItems.length && j < maxItemsPerRow; j++) {
      const item = tierItems[j];
      const itemX = startX + j * (itemSize + 10);
      const itemY = y + (rowHeight - 10 - itemSize) / 2;

      // Item background
      ctx.fillStyle = "rgba(51, 65, 85, 0.8)";
      ctx.roundRect(itemX, itemY, itemSize, itemSize, 8);
      ctx.fill();

      // Rank number
      if (config.showRankNumbers) {
        ctx.fillStyle = tier.color.primary;
        ctx.font = "bold 14px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`#${item.position + 1}`, itemX + 5, itemY + 5);
      }

      // Item title
      if (config.showItemTitles && item.title) {
        ctx.fillStyle = "white";
        ctx.font = "12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const displayTitle =
          item.title.length > 12
            ? item.title.substring(0, 12) + "..."
            : item.title;
        ctx.fillText(displayTitle, itemX + itemSize / 2, itemY + itemSize - 5);
      }
    }

    // Overflow indicator
    if (tierItems.length > maxItemsPerRow) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(
        `+${tierItems.length - maxItemsPerRow} more`,
        startX + maxItemsPerRow * (itemSize + 10),
        y + rowHeight / 2
      );
    }
  }

  // Watermark
  if (config.watermark) {
    ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
    ctx.font = "14px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(config.watermark, config.width - padding, config.height - 20);
  }

  // Convert to blob
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      config.format === "jpg" ? "image/jpeg" : "image/png",
      config.quality
    );
  });
}

/**
 * Export Preview Props
 */
interface ExportPreviewProps {
  tiers: TierDefinition[];
  items: TierItemData[];
  config: TierExportConfig;
}

/**
 * ExportPreview - Live preview of the export
 */
const ExportPreview = memo(function ExportPreview({
  tiers,
  items,
  config,
}: ExportPreviewProps) {
  const aspectRatio = config.width / config.height;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: config.backgroundColor,
        aspectRatio,
        maxHeight: 300,
      }}
    >
      <div className="w-full h-full flex flex-col p-3 gap-1">
        {tiers.map((tier) => {
          const tierItems = items.filter(
            (item) =>
              item.position >= tier.startPosition &&
              item.position < tier.endPosition
          );

          return (
            <div
              key={tier.id}
              className="flex-1 flex items-center gap-2 rounded-lg px-2"
              style={{ background: `${tier.color.primary}15` }}
            >
              {config.showTierLabels && (
                <div
                  className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm"
                  style={{
                    background: tier.color.gradient,
                    color: tier.color.text,
                  }}
                >
                  {tier.label}
                </div>
              )}
              <div className="flex gap-1 overflow-hidden">
                {tierItems.slice(0, 8).map((item) => (
                  <div
                    key={item.itemId}
                    className="w-6 h-6 rounded bg-slate-700/80 flex items-center justify-center"
                  >
                    {config.showRankNumbers && (
                      <span className="text-[8px] text-white">
                        {item.position + 1}
                      </span>
                    )}
                  </div>
                ))}
                {tierItems.length > 8 && (
                  <span className="text-[10px] text-slate-400 self-center">
                    +{tierItems.length - 8}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Main TierExporter Props
 */
interface TierExporterProps {
  tiers: TierDefinition[];
  tieredItems: TieredItem[];
  listTitle?: string;
  onExport?: (blob: Blob, filename: string) => void;
}

/**
 * TierExporter - Main export component
 */
export const TierExporter = memo(function TierExporter({
  tiers,
  tieredItems,
  listTitle = "Tier List",
  onExport,
}: TierExporterProps) {
  const [config, setConfig] = useState<TierExportConfig>({
    ...DEFAULT_EXPORT_CONFIG,
    watermark: "Created with G.O.A.T.",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  // Convert tieredItems to TierItemData
  const items: TierItemData[] = tieredItems.map((item) => ({
    itemId: item.itemId,
    position: item.position,
    tier: item.tier,
  }));

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await generateTierListImage(tiers, items, config);
      const filename = `${listTitle.replace(/\s+/g, "_")}_tier_list.${config.format}`;

      if (onExport) {
        onExport(blob, filename);
      } else {
        // Download directly
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [tiers, items, config, listTitle, onExport]);

  const handleShare = useCallback(async () => {
    try {
      const blob = await generateTierListImage(tiers, items, config);
      const file = new File([blob], "tier_list.png", { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: listTitle,
          text: "Check out my tier list!",
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  }, [tiers, items, config, listTitle]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Export Tier List</h3>
        </div>
        <motion.button
          className="p-2 rounded-lg"
          style={{ background: "rgba(51, 65, 85, 0.4)" }}
          whileHover={{ background: "rgba(71, 85, 105, 0.5)" }}
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings
            className={`w-4 h-4 ${
              showSettings ? "text-blue-400" : "text-slate-400"
            }`}
          />
        </motion.button>
      </div>

      {/* Preview */}
      <ExportPreview tiers={tiers} items={items} config={config} />

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ExportSettings
              config={config}
              onChange={(updates) => setConfig({ ...config, ...updates })}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export info */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {config.width}×{config.height} • {config.format.toUpperCase()}
        </span>
        <span>{tieredItems.length} items</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <motion.button
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            color: "white",
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          {isExporting ? "Exporting..." : "Download"}
        </motion.button>

        <motion.button
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium"
          style={{
            background: "rgba(51, 65, 85, 0.4)",
            color: copied ? "#22c55e" : "white",
          }}
          whileHover={{ background: "rgba(71, 85, 105, 0.5)" }}
          whileTap={{ scale: 0.98 }}
          onClick={handleShare}
        >
          {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
        </motion.button>
      </div>
    </div>
  );
});

export default TierExporter;
