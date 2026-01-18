"use client";

import { memo, useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid3X3, List, ChevronLeft, Sparkles, Home } from "lucide-react";
import {
  CategoryBrowserProps,
  CategoryNode,
  CardVariant,
  NavigationState,
  STORAGE_KEYS,
} from "./types";
import { getCategoryTree, getAncestors, findNodeByName } from "./categoryTree";
import { CategoryCard } from "./CategoryCard";
import { BreadcrumbNav, CompactBreadcrumb } from "./BreadcrumbNav";
import { CategorySearch } from "./CategorySearch";
import { SlideNavigator, StaggerContainer, StaggerItem } from "./NavigationAnimator";

/**
 * View Toggle Component
 */
const ViewToggle = memo(function ViewToggle({
  variant,
  onChange,
  color,
}: {
  variant: CardVariant;
  onChange: (variant: CardVariant) => void;
  color: { primary: string; secondary: string; accent: string };
}) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-lg"
      style={{
        background: "rgba(30, 41, 59, 0.6)",
        border: "1px solid rgba(71, 85, 105, 0.3)",
      }}
    >
      <motion.button
        className="p-1.5 rounded-md transition-colors"
        style={{
          background: variant === "grid" ? `${color.primary}30` : "transparent",
          color: variant === "grid" ? color.accent : "rgba(148, 163, 184, 0.6)",
        }}
        whileHover={{ background: `${color.primary}20` }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onChange("grid")}
      >
        <Grid3X3 className="w-4 h-4" />
      </motion.button>
      <motion.button
        className="p-1.5 rounded-md transition-colors"
        style={{
          background: variant === "list" ? `${color.primary}30` : "transparent",
          color: variant === "list" ? color.accent : "rgba(148, 163, 184, 0.6)",
        }}
        whileHover={{ background: `${color.primary}20` }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onChange("list")}
      >
        <List className="w-4 h-4" />
      </motion.button>
    </div>
  );
});

/**
 * Navigation Header Component
 */
const NavigationHeader = memo(function NavigationHeader({
  currentNode,
  canGoBack,
  onBack,
  onHome,
  color,
}: {
  currentNode: CategoryNode;
  canGoBack: boolean;
  onBack: () => void;
  onHome: () => void;
  color: { primary: string; secondary: string; accent: string };
}) {
  const nodeColor = currentNode.color || color;

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {/* Back button */}
        <AnimatePresence>
          {canGoBack && (
            <motion.button
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg"
              style={{
                background: "rgba(51, 65, 85, 0.4)",
                border: "1px solid rgba(71, 85, 105, 0.3)",
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              whileHover={{ background: "rgba(71, 85, 105, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">Back</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Home button */}
        {currentNode.level > 0 && (
          <motion.button
            className="p-1.5 rounded-lg"
            style={{
              background: "rgba(51, 65, 85, 0.3)",
              border: "1px solid rgba(71, 85, 105, 0.2)",
            }}
            whileHover={{ background: "rgba(71, 85, 105, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onHome}
          >
            <Home className="w-4 h-4 text-slate-400" />
          </motion.button>
        )}

        {/* Current category title */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          key={currentNode.id}
        >
          {currentNode.icon && (
            <currentNode.icon
              className="w-5 h-5"
              style={{ color: nodeColor.accent }}
            />
          )}
          <h2 className="text-lg font-bold text-white">
            {currentNode.id === "root" ? "Categories" : currentNode.label}
          </h2>
          {currentNode.trending && (
            <span
              className="px-1.5 py-0.5 text-[10px] rounded-full font-medium"
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
              }}
            >
              Hot
            </span>
          )}
        </motion.div>
      </div>

      {/* Children count */}
      {currentNode.children.length > 0 && (
        <span className="text-xs text-slate-500">
          {currentNode.children.length} {currentNode.level === 0 ? "categories" : "subcategories"}
        </span>
      )}
    </div>
  );
});

/**
 * Empty State Component
 */
const EmptyState = memo(function EmptyState({
  message,
  color,
}: {
  message: string;
  color: { primary: string; secondary: string; accent: string };
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Sparkles className="w-12 h-12 text-slate-600 mb-3" />
      <p className="text-slate-500 text-center">{message}</p>
    </motion.div>
  );
});

/**
 * Category Grid Component
 */
const CategoryGrid = memo(function CategoryGrid({
  nodes,
  selectedId,
  variant,
  color,
  showPopularity,
  onSelect,
  onNavigate,
}: {
  nodes: CategoryNode[];
  selectedId?: string;
  variant: CardVariant;
  color: { primary: string; secondary: string; accent: string };
  showPopularity: boolean;
  onSelect: (node: CategoryNode) => void;
  onNavigate: (node: CategoryNode) => void;
}) {
  const gridClass =
    variant === "grid"
      ? "grid grid-cols-2 md:grid-cols-3 gap-3"
      : variant === "list"
      ? "flex flex-col gap-2"
      : "flex flex-wrap gap-2";

  return (
    <StaggerContainer className={gridClass} staggerDelay={0.03}>
      {nodes.map((node, index) => (
        <StaggerItem key={node.id}>
          <CategoryCard
            node={node}
            isSelected={node.id === selectedId || node.name === selectedId}
            onClick={() => {
              if (node.children.length > 0) {
                onNavigate(node);
              } else {
                onSelect(node);
              }
            }}
            onNavigate={() => onNavigate(node)}
            color={color}
            variant={variant}
            showPopularity={showPopularity}
            animationDelay={index * 0.03}
          />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
});

/**
 * Main Category Browser Component
 * Visual browser for hierarchical category navigation
 */
export const CategoryBrowser = memo(function CategoryBrowser({
  onSelect,
  selectedCategory,
  selectedSubcategory,
  color,
  showSearch = true,
  showRecents = true,
  showPopularity = true,
  variant: initialVariant = "grid",
  maxRecents = 5,
}: CategoryBrowserProps) {
  // Get category tree
  const tree = useMemo(() => getCategoryTree(), []);

  // State
  const [variant, setVariant] = useState<CardVariant>(initialVariant);
  const [navigationState, setNavigationState] = useState<NavigationState>(() => ({
    currentNode: tree.root,
    breadcrumbs: [tree.root],
    history: [tree.root],
    historyIndex: 0,
  }));
  const [direction, setDirection] = useState<"forward" | "backward" | "none">("none");

  // Initialize to selected category if provided
  useEffect(() => {
    if (selectedCategory && tree) {
      const categoryNode = findNodeByName(tree, selectedCategory);
      if (categoryNode) {
        const ancestors = getAncestors(categoryNode);
        setNavigationState({
          currentNode: categoryNode,
          breadcrumbs: [...ancestors, categoryNode],
          history: [...ancestors, categoryNode],
          historyIndex: ancestors.length,
        });
      }
    }
  }, [selectedCategory, tree]);

  // Navigate to a node
  const navigateTo = useCallback((node: CategoryNode, isBackward = false) => {
    setDirection(isBackward ? "backward" : "forward");
    setNavigationState((prev) => {
      const ancestors = getAncestors(node);
      const breadcrumbs = node.id === "root" ? [node] : [...ancestors, node];

      return {
        currentNode: node,
        breadcrumbs,
        history: [...prev.history.slice(0, prev.historyIndex + 1), node],
        historyIndex: prev.historyIndex + 1,
      };
    });
  }, []);

  // Navigate back
  const navigateBack = useCallback(() => {
    const { currentNode } = navigationState;
    if (currentNode.parent) {
      navigateTo(currentNode.parent, true);
    }
  }, [navigationState, navigateTo]);

  // Navigate home
  const navigateHome = useCallback(() => {
    setDirection("backward");
    setNavigationState({
      currentNode: tree.root,
      breadcrumbs: [tree.root],
      history: [tree.root],
      historyIndex: 0,
    });
  }, [tree]);

  // Handle category selection
  const handleSelect = useCallback(
    (node: CategoryNode) => {
      // Get the category (level 1) and subcategory (level 2)
      let category: string;
      let subcategory: string | undefined;

      if (node.level === 1) {
        category = node.name;
        subcategory = undefined;
      } else if (node.level === 2 && node.parent) {
        category = node.parent.name;
        subcategory = node.name;
      } else {
        // For deeper levels, walk up the tree
        let current = node;
        while (current.level > 1 && current.parent) {
          current = current.parent;
        }
        category = current.parent?.name || current.name;
        subcategory = node.name;
      }

      onSelect(category, subcategory);
    },
    [onSelect]
  );

  // Handle search selection
  const handleSearchSelect = useCallback(
    (node: CategoryNode) => {
      // Navigate to the node's parent to show context, then select
      if (node.parent && node.parent.id !== "root") {
        navigateTo(node.parent);
      }
      handleSelect(node);
    },
    [navigateTo, handleSelect]
  );

  // Handle card navigation (drilling into subcategories)
  const handleNavigate = useCallback(
    (node: CategoryNode) => {
      navigateTo(node);
    },
    [navigateTo]
  );

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback(
    (node: CategoryNode) => {
      const isBackward = node.level < navigationState.currentNode.level;
      navigateTo(node, isBackward);
    },
    [navigationState.currentNode.level, navigateTo]
  );

  const { currentNode, breadcrumbs } = navigationState;
  const canGoBack = currentNode.parent !== undefined;
  const navigationKey = `${currentNode.id}-${currentNode.level}`;

  return (
    <div className="w-full">
      {/* Search bar */}
      {showSearch && (
        <div className="mb-4">
          <CategorySearch
            tree={tree}
            onSelect={handleSearchSelect}
            color={color}
            placeholder="Search categories..."
          />
        </div>
      )}

      {/* Breadcrumb navigation */}
      {breadcrumbs.length > 1 && (
        <div className="mb-4">
          <BreadcrumbNav
            breadcrumbs={breadcrumbs}
            onNavigate={handleBreadcrumbNavigate}
            color={color}
          />
        </div>
      )}

      {/* Header with back button and view toggle */}
      <div className="flex items-center justify-between mb-4">
        <NavigationHeader
          currentNode={currentNode}
          canGoBack={canGoBack}
          onBack={navigateBack}
          onHome={navigateHome}
          color={color}
        />
        <ViewToggle variant={variant} onChange={setVariant} color={color} />
      </div>

      {/* Category description */}
      {currentNode.description && currentNode.id !== "root" && (
        <motion.p
          className="text-sm text-slate-400 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={currentNode.id}
        >
          {currentNode.description}
        </motion.p>
      )}

      {/* Category grid with navigation animation */}
      <SlideNavigator direction={direction} navigationKey={navigationKey}>
        {currentNode.children.length > 0 ? (
          <CategoryGrid
            nodes={currentNode.children}
            selectedId={selectedSubcategory || selectedCategory}
            variant={variant}
            color={color}
            showPopularity={showPopularity}
            onSelect={handleSelect}
            onNavigate={handleNavigate}
          />
        ) : (
          <EmptyState
            message="No subcategories available. Click to select this category."
            color={color}
          />
        )}
      </SlideNavigator>

      {/* Selection indicator */}
      <AnimatePresence>
        {(selectedCategory || selectedSubcategory) && (
          <motion.div
            className="mt-6 p-4 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${color.primary}15, ${color.secondary}10)`,
              border: `1px solid ${color.primary}30`,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Selected:</span>
              <span className="text-sm font-medium text-white">
                {selectedCategory}
                {selectedSubcategory && ` → ${selectedSubcategory}`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default CategoryBrowser;
