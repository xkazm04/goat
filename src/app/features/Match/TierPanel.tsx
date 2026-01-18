"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Settings,
  BarChart3,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTierStore } from "@/stores/tier-store";
import {
  TierCustomizer,
  TierSummaryPanel,
  TierExporter,
  CompactTierSummary,
} from "@/lib/tiers";

interface TierPanelProps {
  listTitle?: string;
  listSize: number;
}

/**
 * TierToggle - Quick enable/disable tier view
 */
const TierToggle = memo(function TierToggle() {
  const enabled = useTierStore((state) => state.configuration.enabled);
  const setEnabled = useTierStore((state) => state.setEnabled);

  return (
    <motion.button
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
      style={{
        background: enabled
          ? "rgba(139, 92, 246, 0.2)"
          : "rgba(51, 65, 85, 0.4)",
        border: enabled
          ? "1px solid rgba(139, 92, 246, 0.4)"
          : "1px solid rgba(71, 85, 105, 0.3)",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setEnabled(!enabled)}
    >
      <Layers
        className={`w-4 h-4 ${enabled ? "text-purple-400" : "text-slate-400"}`}
      />
      <span
        className={`text-sm font-medium ${
          enabled ? "text-white" : "text-slate-400"
        }`}
      >
        {enabled ? "Tiers On" : "Tiers Off"}
      </span>
      <div
        className={`w-8 h-5 rounded-full p-0.5 transition-colors ${
          enabled ? "bg-purple-500" : "bg-slate-600"
        }`}
      >
        <motion.div
          className="w-4 h-4 rounded-full bg-white"
          animate={{ x: enabled ? 12 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </motion.button>
  );
});

/**
 * CollapsibleSection - Expandable section for panel organization
 */
const CollapsibleSection = memo(function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/50 last:border-b-0">
      <motion.button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 90 : 0 }}>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * TierPanel - Main tier control panel for sidebar
 */
export const TierPanel = memo(function TierPanel({
  listTitle = "My List",
  listSize,
}: TierPanelProps) {
  const enabled = useTierStore((state) => state.configuration.enabled);
  const configuration = useTierStore((state) => state.configuration);
  const currentTiers = useTierStore((state) => state.currentTiers);
  const tieredItems = useTierStore((state) => state.tieredItems);
  const summary = useTierStore((state) => state.summary);
  const suggestions = useTierStore((state) => state.suggestions);

  // Actions
  const setPreset = useTierStore((state) => state.setPreset);
  const toggleBands = useTierStore((state) => state.toggleBands);
  const toggleLabels = useTierStore((state) => state.toggleLabels);
  const toggleSeparators = useTierStore((state) => state.toggleSeparators);
  const adjustBoundary = useTierStore((state) => state.adjustBoundary);
  const applySuggestion = useTierStore((state) => state.applySuggestion);
  const applyAlgorithm = useTierStore((state) => state.applyAlgorithm);
  const reset = useTierStore((state) => state.reset);

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
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Smart Tiers</h3>
        </div>
        <TierToggle />
      </div>

      {/* Content */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Quick stats */}
            <div className="p-4 border-b border-slate-700/50">
              <CompactTierSummary
                tiers={currentTiers}
                tieredItems={tieredItems}
              />
            </div>

            {/* Settings section */}
            <CollapsibleSection
              title="Settings"
              icon={<Settings className="w-4 h-4" />}
              defaultOpen
            >
              <TierCustomizer
                configuration={configuration}
                listSize={listSize}
                tiers={currentTiers}
                suggestions={suggestions}
                onPresetChange={setPreset}
                onThresholdChange={adjustBoundary}
                onAlgorithmChange={applyAlgorithm}
                onApplySuggestion={applySuggestion}
                onToggleBands={toggleBands}
                onToggleLabels={toggleLabels}
                onToggleSeparators={toggleSeparators}
                onReset={reset}
              />
            </CollapsibleSection>

            {/* Summary section */}
            {summary && (
              <CollapsibleSection
                title="Statistics"
                icon={<BarChart3 className="w-4 h-4" />}
              >
                <TierSummaryPanel
                  summary={summary}
                  tiers={currentTiers}
                  tieredItems={tieredItems}
                />
              </CollapsibleSection>
            )}

            {/* Export section */}
            <CollapsibleSection
              title="Export"
              icon={<Download className="w-4 h-4" />}
            >
              <TierExporter
                tiers={currentTiers}
                tieredItems={tieredItems}
                listTitle={listTitle}
              />
            </CollapsibleSection>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disabled state hint */}
      {!enabled && (
        <div className="p-4 text-center">
          <p className="text-sm text-slate-500">
            Enable tiers to classify your rankings into S, A, B, C tiers
          </p>
        </div>
      )}
    </div>
  );
});

/**
 * Compact tier button for toolbar
 */
export const TierButton = memo(function TierButton({
  onClick,
}: {
  onClick?: () => void;
}) {
  const enabled = useTierStore((state) => state.configuration.enabled);
  const setEnabled = useTierStore((state) => state.setEnabled);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setEnabled(!enabled);
    }
  };

  return (
    <motion.button
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: enabled
          ? "rgba(139, 92, 246, 0.2)"
          : "rgba(51, 65, 85, 0.4)",
        border: enabled
          ? "1px solid rgba(139, 92, 246, 0.4)"
          : "1px solid rgba(71, 85, 105, 0.3)",
        color: enabled ? "#a78bfa" : "rgba(148, 163, 184, 0.8)",
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
    >
      <Layers className="w-3.5 h-3.5" />
      <span>Tiers</span>
    </motion.button>
  );
});

export default TierPanel;
