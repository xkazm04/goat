"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { DiffIndicator, ComparisonDot, getDiffStatus, type DiffStatus } from "./DiffIndicator";
import type { AttributeComparisonResult } from "@/lib/comparison/attribute-comparators";

interface AttributeRowProps {
  attribute: AttributeComparisonResult;
  itemCount: number;
  showLabels?: boolean;
  variant?: "default" | "compact" | "detailed";
  index?: number;
}

/**
 * AttributeRow - Single row comparing one attribute across items
 */
export const AttributeRow = memo(function AttributeRow({
  attribute,
  itemCount,
  showLabels = true,
  variant = "default",
  index = 0,
}: AttributeRowProps) {
  const isComparable = attribute.type !== "text";

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2">
        <span className="text-xs text-slate-500 w-20 truncate">{attribute.label}</span>
        <div className="flex-1 flex items-center gap-2">
          {attribute.formattedValues.map((value, i) => {
            const status = isComparable ? getDiffStatus(i, attribute.winnerIndex) : "neutral";
            return (
              <div
                key={i}
                className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-xs
                  ${status === "winner" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400"}
                `}
              >
                {isComparable && <ComparisonDot status={status} size="sm" />}
                <span className="truncate">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <motion.div
        className="py-3 border-b border-slate-800/50 last:border-0"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">{attribute.label}</span>
          {isComparable && attribute.winnerIndex !== null && (
            <DiffIndicator status="winner" showLabel size="sm" />
          )}
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${itemCount}, 1fr)` }}>
          {attribute.formattedValues.map((value, i) => {
            const status = isComparable ? getDiffStatus(i, attribute.winnerIndex) : "neutral";
            const isWinner = status === "winner";

            return (
              <motion.div
                key={i}
                className={`
                  relative p-3 rounded-lg text-center transition-all
                  ${isWinner
                    ? "bg-linear-to-b from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30"
                    : "bg-slate-800/30 border border-slate-700/30"}
                `}
                animate={isWinner ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <span
                  className={`text-sm font-medium ${isWinner ? "text-emerald-400" : "text-slate-300"}`}
                >
                  {value}
                </span>
                {isWinner && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    <ComparisonDot status="winner" size="md" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      className="flex items-stretch border-b border-slate-800/40 last:border-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
    >
      {/* Attribute label */}
      {showLabels && (
        <div className="w-28 shrink-0 py-3 px-4 bg-slate-900/30 border-r border-slate-800/40">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {attribute.label}
          </span>
        </div>
      )}

      {/* Values grid */}
      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${itemCount}, 1fr)` }}>
        {attribute.formattedValues.map((value, i) => {
          const status = isComparable ? getDiffStatus(i, attribute.winnerIndex) : "neutral";
          const isWinner = status === "winner";

          return (
            <div
              key={i}
              className={`
                flex items-center justify-center gap-2 py-3 px-3
                border-r border-slate-800/40 last:border-0
                ${isWinner ? "bg-emerald-500/5" : ""}
              `}
            >
              {isComparable && <DiffIndicator status={status} size="sm" />}
              <span
                className={`text-sm ${isWinner ? "text-emerald-400 font-medium" : "text-slate-300"}`}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});

/**
 * AttributeRowSkeleton - Loading skeleton for attribute rows
 */
export const AttributeRowSkeleton = memo(function AttributeRowSkeleton({
  itemCount = 2,
}: {
  itemCount?: number;
}) {
  return (
    <div className="flex items-stretch border-b border-slate-800/40 animate-pulse">
      <div className="w-28 shrink-0 py-3 px-4 bg-slate-900/30 border-r border-slate-800/40">
        <div className="h-3 w-16 bg-slate-700/50 rounded" />
      </div>
      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${itemCount}, 1fr)` }}>
        {Array.from({ length: itemCount }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center gap-2 py-3 px-3 border-r border-slate-800/40 last:border-0"
          >
            <div className="w-4 h-4 bg-slate-700/50 rounded-full" />
            <div className="h-4 w-12 bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
});

export type { AttributeRowProps };
