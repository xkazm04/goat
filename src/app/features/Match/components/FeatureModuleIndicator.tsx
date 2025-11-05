"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, type ReactElement } from "react";
import { ChevronDown, ChevronUp, Box, Layers } from "lucide-react";

interface ModuleNode {
  name: string;
  active: boolean;
  children?: ModuleNode[];
}

interface FeatureModuleIndicatorProps {
  activeModules: string[];
}

export const FeatureModuleIndicator = ({ activeModules }: FeatureModuleIndicatorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Define the feature module tree structure
  const moduleTree: ModuleNode[] = [
    {
      name: "MatchContainer",
      active: activeModules.includes("MatchContainer"),
      children: [
        {
          name: "MatchState",
          active: activeModules.includes("MatchState"),
        },
        {
          name: "MatchGrid",
          active: activeModules.includes("MatchGrid"),
          children: [
            {
              name: "MatchPodium",
              active: activeModules.includes("MatchPodium"),
            },
            {
              name: "MatchControls",
              active: activeModules.includes("MatchControls"),
              children: [
                {
                  name: "MatchGridSlot",
                  active: activeModules.includes("MatchGridSlot"),
                },
                {
                  name: "MatchEmptySlot",
                  active: activeModules.includes("MatchEmptySlot"),
                },
                {
                  name: "MatchGridItem",
                  active: activeModules.includes("MatchGridItem"),
                },
              ],
            },
          ],
        },
        {
          name: "MatchGrid/lib",
          active: activeModules.includes("dragHandlers") ||
                  activeModules.includes("gridCalculations") ||
                  activeModules.includes("sizeMapping"),
          children: [
            {
              name: "dragHandlers",
              active: activeModules.includes("dragHandlers"),
            },
            {
              name: "gridCalculations",
              active: activeModules.includes("gridCalculations"),
            },
            {
              name: "sizeMapping",
              active: activeModules.includes("sizeMapping"),
            },
          ],
        },
      ],
    },
  ];

  const renderNode = (node: ModuleNode, depth: number = 0): ReactElement => {
    const hasChildren = node.children && node.children.length > 0;
    const indent = depth * 16;

    return (
      <motion.div
        key={node.name}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: depth * 0.05 }}
        className="text-xs"
      >
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded transition-all duration-200 ${
            node.active
              ? "bg-blue-500/20 text-blue-300 font-semibold"
              : "text-slate-400"
          }`}
          style={{ marginLeft: `${indent}px` }}
        >
          {hasChildren ? (
            <Layers className="w-3 h-3" />
          ) : (
            <Box className="w-3 h-3" />
          )}
          <span className="font-mono">{node.name}</span>
          {node.active && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
            />
          )}
        </div>
        {hasChildren && (
          <div className="mt-1">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="fixed top-20 right-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-slate-700/50 overflow-hidden"
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-slate-200">
              Feature Modules
            </span>
            <motion.span
              key={activeModules.length}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="px-2 py-0.5 text-xs font-bold bg-blue-500/20 text-blue-300 rounded-full"
            >
              {activeModules.length}
            </motion.span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Collapsible Tree */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-slate-700/50"
            >
              <div className="p-4 max-h-96 overflow-y-auto">
                {moduleTree.map((node) => renderNode(node))}
              </div>

              {/* Footer info */}
              <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/50">
                <p className="text-xs text-slate-400">
                  <span className="text-blue-400 font-semibold">●</span> Active
                  during drag operations
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
