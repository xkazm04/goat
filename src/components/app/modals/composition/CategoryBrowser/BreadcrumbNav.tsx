"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Home, Folder } from "lucide-react";
import { BreadcrumbNavProps, CategoryNode } from "./types";

/**
 * Breadcrumb Item Component
 */
const BreadcrumbItem = memo(function BreadcrumbItem({
  node,
  isLast,
  onClick,
  color,
  index,
}: {
  node: CategoryNode;
  isLast: boolean;
  onClick: () => void;
  color: { primary: string; secondary: string; accent: string };
  index: number;
}) {
  const Icon = node.icon || (node.id === "root" ? Home : Folder);
  const nodeColor = node.color || color;

  return (
    <motion.div
      className="flex items-center"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <motion.button
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 ${
          isLast ? "cursor-default" : "cursor-pointer"
        }`}
        style={{
          background: isLast
            ? `linear-gradient(135deg, ${nodeColor.primary}30, ${nodeColor.secondary}20)`
            : "transparent",
          border: isLast
            ? `1px solid ${nodeColor.primary}40`
            : "1px solid transparent",
        }}
        whileHover={
          !isLast
            ? {
                background: "rgba(71, 85, 105, 0.3)",
                borderColor: "rgba(71, 85, 105, 0.4)",
              }
            : undefined
        }
        whileTap={!isLast ? { scale: 0.97 } : undefined}
        onClick={() => !isLast && onClick()}
        disabled={isLast}
      >
        <Icon
          className="w-3.5 h-3.5"
          style={{
            color: isLast ? nodeColor.accent : "rgba(148, 163, 184, 0.6)",
          }}
        />
        <span
          className={`text-sm ${
            isLast ? "font-semibold text-white" : "text-slate-400"
          }`}
        >
          {node.id === "root" ? "All" : node.label}
        </span>
      </motion.button>

      {/* Separator */}
      {!isLast && (
        <motion.div
          className="mx-1"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 + 0.1 }}
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </motion.div>
      )}
    </motion.div>
  );
});

/**
 * Breadcrumb Navigation Component
 * Displays hierarchical path and allows navigation
 */
export const BreadcrumbNav = memo(function BreadcrumbNav({
  breadcrumbs,
  onNavigate,
  color,
}: BreadcrumbNavProps) {
  if (breadcrumbs.length === 0) return null;

  return (
    <motion.nav
      className="flex items-center flex-wrap gap-0.5 p-2 rounded-xl"
      style={{
        background: "rgba(15, 23, 42, 0.4)",
        border: "1px solid rgba(71, 85, 105, 0.2)",
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <AnimatePresence mode="popLayout">
        {breadcrumbs.map((node, index) => (
          <BreadcrumbItem
            key={node.id}
            node={node}
            isLast={index === breadcrumbs.length - 1}
            onClick={() => onNavigate(node)}
            color={color}
            index={index}
          />
        ))}
      </AnimatePresence>
    </motion.nav>
  );
});

/**
 * Compact breadcrumb for mobile
 */
export const CompactBreadcrumb = memo(function CompactBreadcrumb({
  breadcrumbs,
  onNavigate,
  color,
}: BreadcrumbNavProps) {
  if (breadcrumbs.length <= 1) return null;

  const current = breadcrumbs[breadcrumbs.length - 1];
  const parent = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;
  const nodeColor = current.color || color;

  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Back button */}
      {parent && (
        <motion.button
          className="flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{
            background: "rgba(51, 65, 85, 0.4)",
            border: "1px solid rgba(71, 85, 105, 0.3)",
          }}
          whileHover={{ background: "rgba(71, 85, 105, 0.4)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate(parent)}
        >
          <ChevronRight className="w-4 h-4 rotate-180 text-slate-400" />
          <span className="text-xs text-slate-400">
            {parent.id === "root" ? "All" : parent.label}
          </span>
        </motion.button>
      )}

      {/* Current location */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${nodeColor.primary}20, ${nodeColor.secondary}10)`,
          border: `1px solid ${nodeColor.primary}30`,
        }}
      >
        {current.icon && (
          <current.icon className="w-3.5 h-3.5" style={{ color: nodeColor.accent }} />
        )}
        <span className="text-sm font-medium text-white">{current.label}</span>
      </div>
    </motion.div>
  );
});

/**
 * Breadcrumb with dropdown for deep hierarchies
 */
export const CollapsibleBreadcrumb = memo(function CollapsibleBreadcrumb({
  breadcrumbs,
  onNavigate,
  color,
  maxVisible = 3,
}: BreadcrumbNavProps & { maxVisible?: number }) {
  if (breadcrumbs.length === 0) return null;

  const shouldCollapse = breadcrumbs.length > maxVisible;
  const visibleBreadcrumbs = shouldCollapse
    ? [
        breadcrumbs[0],
        ...breadcrumbs.slice(-maxVisible + 1),
      ]
    : breadcrumbs;
  const hiddenBreadcrumbs = shouldCollapse
    ? breadcrumbs.slice(1, -maxVisible + 1)
    : [];

  return (
    <motion.nav
      className="flex items-center gap-0.5 p-2 rounded-xl"
      style={{
        background: "rgba(15, 23, 42, 0.4)",
        border: "1px solid rgba(71, 85, 105, 0.2)",
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {visibleBreadcrumbs.map((node, index) => {
        const isFirst = index === 0;
        const isLast = index === visibleBreadcrumbs.length - 1;

        return (
          <div key={node.id} className="flex items-center">
            {/* Show collapsed indicator after first item */}
            {isFirst && shouldCollapse && hiddenBreadcrumbs.length > 0 && (
              <>
                <BreadcrumbItem
                  node={node}
                  isLast={false}
                  onClick={() => onNavigate(node)}
                  color={color}
                  index={0}
                />
                <motion.div
                  className="relative group"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <button
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200"
                    style={{
                      background: "rgba(51, 65, 85, 0.3)",
                      border: "1px solid rgba(71, 85, 105, 0.2)",
                    }}
                  >
                    <span className="text-xs">•••</span>
                  </button>

                  {/* Dropdown */}
                  <div className="absolute top-full left-0 mt-1 py-1 rounded-lg bg-slate-800 border border-slate-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    {hiddenBreadcrumbs.map((hidden) => (
                      <button
                        key={hidden.id}
                        className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700"
                        onClick={() => onNavigate(hidden)}
                      >
                        {hidden.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
                <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />
              </>
            )}

            {/* Regular breadcrumb items */}
            {!(isFirst && shouldCollapse) && (
              <BreadcrumbItem
                node={node}
                isLast={isLast}
                onClick={() => onNavigate(node)}
                color={color}
                index={index}
              />
            )}
          </div>
        );
      })}
    </motion.nav>
  );
});

export default BreadcrumbNav;
