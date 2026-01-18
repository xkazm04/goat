"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, TrendingUp, Sparkles, Folder } from "lucide-react";
import { CategoryCardProps, CategoryNode } from "./types";

/**
 * Popularity Badge Component
 */
const PopularityBadge = memo(function PopularityBadge({
  popularity,
  color,
}: {
  popularity: number;
  color: string;
}) {
  const level = popularity >= 90 ? "hot" : popularity >= 70 ? "popular" : "growing";

  return (
    <motion.div
      className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
      style={{
        background:
          level === "hot"
            ? "rgba(239, 68, 68, 0.2)"
            : level === "popular"
            ? "rgba(251, 191, 36, 0.2)"
            : "rgba(34, 197, 94, 0.2)",
        color:
          level === "hot"
            ? "#ef4444"
            : level === "popular"
            ? "#fbbf24"
            : "#22c55e",
        border: `1px solid ${
          level === "hot"
            ? "rgba(239, 68, 68, 0.3)"
            : level === "popular"
            ? "rgba(251, 191, 36, 0.3)"
            : "rgba(34, 197, 94, 0.3)"
        }`,
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2, type: "spring" }}
    >
      {level === "hot" && <TrendingUp className="w-2.5 h-2.5" />}
      {level === "popular" && <Sparkles className="w-2.5 h-2.5" />}
      <span>{popularity}%</span>
    </motion.div>
  );
});

/**
 * Grid variant of Category Card
 */
const GridCard = memo(function GridCard({
  node,
  isSelected,
  isHighlighted,
  onClick,
  onNavigate,
  color,
  showPopularity,
  animationDelay = 0,
}: CategoryCardProps) {
  const Icon = node.icon || Folder;
  const hasChildren = node.children.length > 0;
  const nodeColor = node.color || color;

  return (
    <motion.div
      className="relative group cursor-pointer"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ delay: animationDelay, duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div
        className="relative p-4 rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-300"
        style={{
          background: isSelected
            ? `linear-gradient(135deg, ${nodeColor.primary}50, ${nodeColor.secondary}40)`
            : isHighlighted
            ? `linear-gradient(135deg, ${nodeColor.primary}30, ${nodeColor.secondary}20)`
            : "linear-gradient(135deg, rgba(51, 65, 85, 0.5), rgba(71, 85, 105, 0.3))",
          border: `2px solid ${
            isSelected
              ? `${nodeColor.primary}70`
              : isHighlighted
              ? `${nodeColor.primary}40`
              : "rgba(71, 85, 105, 0.3)"
          }`,
          boxShadow: isSelected
            ? `0 8px 30px ${nodeColor.primary}30, inset 0 1px 0 rgba(255, 255, 255, 0.15)`
            : "0 4px 20px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Background glow on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${nodeColor.primary}20, transparent 70%)`,
          }}
        />

        {/* Popularity badge */}
        {showPopularity && node.popularity && (
          <PopularityBadge popularity={node.popularity} color={nodeColor.primary} />
        )}

        {/* Icon */}
        <motion.div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 relative"
          style={{
            background: `linear-gradient(135deg, ${nodeColor.primary}30, ${nodeColor.secondary}20)`,
            boxShadow: `0 4px 15px ${nodeColor.primary}20, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
          }}
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <Icon
            className="w-6 h-6"
            style={{ color: isSelected ? "white" : nodeColor.accent }}
          />

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100"
            style={{
              background: `linear-gradient(45deg, transparent 30%, ${nodeColor.accent}40 50%, transparent 70%)`,
            }}
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
        </motion.div>

        {/* Content */}
        <div className="relative z-10">
          <h3
            className={`text-base font-bold mb-1 ${
              isSelected ? "text-white" : "text-slate-200"
            }`}
          >
            {node.label}
          </h3>

          {node.description && (
            <p
              className={`text-xs line-clamp-2 ${
                isSelected ? "text-slate-200" : "text-slate-400"
              }`}
            >
              {node.description}
            </p>
          )}

          {/* Children indicator */}
          {hasChildren && (
            <motion.div
              className="flex items-center gap-1 mt-2 text-xs"
              style={{ color: nodeColor.accent }}
              whileHover={{ x: 3 }}
            >
              <span>{node.children.length} subcategories</span>
              <ChevronRight className="w-3 h-3" />
            </motion.div>
          )}
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl"
            style={{
              background: `linear-gradient(90deg, ${nodeColor.primary}, ${nodeColor.accent})`,
            }}
            layoutId="categorySelection"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        {/* Trending badge */}
        {node.trending && (
          <motion.div
            className="absolute top-2 left-2"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <div
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <TrendingUp className="w-2.5 h-2.5" />
              Hot
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

/**
 * List variant of Category Card
 */
const ListCard = memo(function ListCard({
  node,
  isSelected,
  isHighlighted,
  onClick,
  onNavigate,
  color,
  showPopularity,
  animationDelay = 0,
}: CategoryCardProps) {
  const Icon = node.icon || Folder;
  const hasChildren = node.children.length > 0;
  const nodeColor = node.color || color;

  return (
    <motion.div
      className="relative group cursor-pointer"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: animationDelay, duration: 0.2 }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
    >
      <div
        className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300"
        style={{
          background: isSelected
            ? `linear-gradient(135deg, ${nodeColor.primary}40, ${nodeColor.secondary}30)`
            : isHighlighted
            ? `linear-gradient(135deg, ${nodeColor.primary}20, ${nodeColor.secondary}10)`
            : "linear-gradient(135deg, rgba(51, 65, 85, 0.4), rgba(71, 85, 105, 0.2))",
          border: `2px solid ${
            isSelected
              ? `${nodeColor.primary}60`
              : isHighlighted
              ? `${nodeColor.primary}30`
              : "rgba(71, 85, 105, 0.2)"
          }`,
          boxShadow: isSelected
            ? `0 4px 20px ${nodeColor.primary}20`
            : "none",
        }}
      >
        {/* Icon */}
        <motion.div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${nodeColor.primary}30, ${nodeColor.secondary}20)`,
          }}
          whileHover={{ scale: 1.1 }}
        >
          <Icon
            className="w-5 h-5"
            style={{ color: isSelected ? "white" : nodeColor.accent }}
          />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`text-sm font-semibold ${
                isSelected ? "text-white" : "text-slate-200"
              }`}
            >
              {node.label}
            </h3>

            {node.trending && (
              <span
                className="text-[10px] px-1 rounded"
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
                }}
              >
                Hot
              </span>
            )}
          </div>

          {node.description && (
            <p
              className={`text-xs truncate ${
                isSelected ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {node.description}
            </p>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {showPopularity && node.popularity && (
            <div
              className="text-xs font-medium"
              style={{ color: nodeColor.accent }}
            >
              {node.popularity}%
            </div>
          )}

          {hasChildren && (
            <motion.div
              className="flex items-center gap-1 text-xs"
              style={{ color: "rgba(148, 163, 184, 0.6)" }}
              whileHover={{ x: 2, color: nodeColor.accent }}
            >
              <span>{node.children.length}</span>
              <ChevronRight className="w-4 h-4" />
            </motion.div>
          )}

          {/* Selection indicator */}
          <motion.div
            className={`w-4 h-4 rounded-full border-2 ${
              isSelected ? "border-white" : "border-slate-500"
            }`}
            style={{
              background: isSelected
                ? `linear-gradient(135deg, ${nodeColor.primary}, ${nodeColor.secondary})`
                : "transparent",
            }}
            animate={{
              scale: isSelected ? 1.1 : 1,
            }}
            transition={{ type: "spring", stiffness: 300 }}
          />
        </div>
      </div>
    </motion.div>
  );
});

/**
 * Compact variant of Category Card
 */
const CompactCard = memo(function CompactCard({
  node,
  isSelected,
  onClick,
  color,
  animationDelay = 0,
}: CategoryCardProps) {
  const Icon = node.icon || Folder;
  const nodeColor = node.color || color;

  return (
    <motion.button
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${nodeColor.primary}60, ${nodeColor.secondary}50)`
          : "rgba(51, 65, 85, 0.4)",
        border: `1px solid ${
          isSelected ? `${nodeColor.primary}50` : "rgba(71, 85, 105, 0.3)"
        }`,
        color: isSelected ? "white" : "rgba(148, 163, 184, 0.8)",
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: animationDelay }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      <Icon className="w-4 h-4" style={{ color: nodeColor.accent }} />
      <span className="text-sm font-medium">{node.label}</span>
    </motion.button>
  );
});

/**
 * Main Category Card Component
 * Renders the appropriate variant based on props
 */
export const CategoryCard = memo(function CategoryCard(props: CategoryCardProps) {
  const { variant = "grid" } = props;

  switch (variant) {
    case "list":
      return <ListCard {...props} />;
    case "compact":
      return <CompactCard {...props} />;
    case "grid":
    default:
      return <GridCard {...props} />;
  }
});

export default CategoryCard;
