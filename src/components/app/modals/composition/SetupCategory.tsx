"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid3X3, ListOrdered, Sparkles } from "lucide-react";
import { SubcategoryDefinition } from "@/lib/config/category-config";
import { CategoryBrowser } from "./CategoryBrowser";

type Props = {
  categories: string[];
  handleCategoryChange: (category: string) => void;
  selectedCategory: string;
  color: { primary: string; secondary: string; accent: string };
  /** Subcategories from centralized CATEGORY_CONFIG */
  subcategories: SubcategoryDefinition[];
  selectedSubcategory?: string;
  setSelectedSubcategory?: (subcategory: string) => void;
  /** Enable visual browser mode (default: true) */
  useVisualBrowser?: boolean;
};

/**
 * View Mode Toggle Component
 */
const ViewModeToggle = memo(function ViewModeToggle({
  isVisualMode,
  onToggle,
  color,
}: {
  isVisualMode: boolean;
  onToggle: () => void;
  color: { primary: string; secondary: string; accent: string };
}) {
  return (
    <motion.div
      className="flex items-center gap-2 mb-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="text-xs text-slate-500">View:</span>
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{
          background: "rgba(30, 41, 59, 0.6)",
          border: "1px solid rgba(71, 85, 105, 0.3)",
        }}
      >
        <motion.button
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
          style={{
            background: isVisualMode ? `${color.primary}30` : "transparent",
            color: isVisualMode ? color.accent : "rgba(148, 163, 184, 0.6)",
          }}
          whileHover={{ background: `${color.primary}20` }}
          whileTap={{ scale: 0.95 }}
          onClick={() => !isVisualMode && onToggle()}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          <span>Visual</span>
        </motion.button>
        <motion.button
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
          style={{
            background: !isVisualMode ? `${color.primary}30` : "transparent",
            color: !isVisualMode ? color.accent : "rgba(148, 163, 184, 0.6)",
          }}
          whileHover={{ background: `${color.primary}20` }}
          whileTap={{ scale: 0.95 }}
          onClick={() => isVisualMode && onToggle()}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Simple</span>
        </motion.button>
      </div>
    </motion.div>
  );
});

/**
 * Simple Category Selector (original implementation)
 */
const SimpleCategorySelector = memo(function SimpleCategorySelector({
  categories,
  handleCategoryChange,
  selectedCategory,
  color,
  subcategories,
  selectedSubcategory,
  setSelectedSubcategory,
}: Omit<Props, "useVisualBrowser">) {
  return (
    <>
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-4">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((category, index) => (
            <motion.button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-2 rounded-xl border-none outline-none text-sm font-semibold transition-all duration-300 backdrop-blur-sm ${
                selectedCategory === category
                  ? "text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              style={
                selectedCategory === category
                  ? {
                      background: `linear-gradient(135deg, ${color.primary}70, ${color.secondary}70)`,
                      boxShadow: `
                                0 4px 20px ${color.primary}30,
                                inset 0 1px 0 rgba(255, 255, 255, 0.2),
                                inset 0 -1px 0 rgba(0, 0, 0, 0.2)
                            `,
                      border: `1px solid ${color.primary}50`,
                    }
                  : {
                      background: `linear-gradient(135deg, rgba(51, 65, 85, 0.6), rgba(71, 85, 105, 0.4))`,
                      boxShadow: `
                                0 2px 10px rgba(0, 0, 0, 0.2),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1)
                            `,
                      border: "1px solid rgba(71, 85, 105, 0.3)",
                    }
              }
              whileHover={{
                scale: 1.05,
                boxShadow:
                  selectedCategory === category
                    ? `0 6px 25px ${color.primary}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                    : "0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {category}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Subcategories with enhanced styling - dynamically shown based on category config */}
      <AnimatePresence>
        {subcategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="mb-8"
          >
            <label className="block text-sm font-medium text-slate-300 mb-4">
              Subcategory
            </label>
            <div className="space-y-3">
              {subcategories.map((subcategory, index) => (
                <motion.button
                  key={subcategory.value}
                  onClick={() => setSelectedSubcategory?.(subcategory.value)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center gap-3 group backdrop-blur-sm ${
                    selectedSubcategory === subcategory.value
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  style={
                    selectedSubcategory === subcategory.value
                      ? {
                          background: `linear-gradient(135deg, ${color.primary}50, ${color.secondary}40)`,
                          border: `2px solid ${color.primary}60`,
                          boxShadow: `
                                        0 8px 25px ${color.primary}25,
                                        inset 0 1px 0 rgba(255, 255, 255, 0.2),
                                        inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                                    `,
                        }
                      : {
                          background: `linear-gradient(135deg, rgba(51, 65, 85, 0.4), rgba(71, 85, 105, 0.3))`,
                          border: "2px solid rgba(71, 85, 105, 0.3)",
                          boxShadow: `
                                        0 4px 15px rgba(0, 0, 0, 0.2),
                                        inset 0 1px 0 rgba(255, 255, 255, 0.1)
                                    `,
                        }
                  }
                  whileHover={{
                    scale: 1.02,
                    boxShadow:
                      selectedSubcategory === subcategory.value
                        ? `0 12px 30px ${color.primary}30, inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                        : "0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {subcategory.icon && (
                    <motion.div
                      className="w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm"
                      style={{
                        background:
                          selectedSubcategory === subcategory.value
                            ? `linear-gradient(135deg, ${color.primary}80, ${color.secondary}80)`
                            : `linear-gradient(135deg, ${color.primary}30, ${color.secondary}20)`,
                        boxShadow: `0 4px 15px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                        color:
                          selectedSubcategory === subcategory.value
                            ? "#fff"
                            : color.accent,
                      }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <subcategory.icon className="w-5 h-5" />
                    </motion.div>
                  )}
                  <div className="flex-1">
                    <span className="font-medium text-base">
                      {subcategory.label}
                    </span>
                    {subcategory.description && (
                      <div
                        className={`text-xs mt-1 ${
                          selectedSubcategory === subcategory.value
                            ? "text-slate-300"
                            : "text-slate-500"
                        }`}
                      >
                        {subcategory.description}
                      </div>
                    )}
                  </div>

                  {/* Selection indicator */}
                  <motion.div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedSubcategory === subcategory.value
                        ? "border-white"
                        : "border-slate-400"
                    }`}
                    style={{
                      background:
                        selectedSubcategory === subcategory.value
                          ? `linear-gradient(135deg, ${color.primary}, ${color.secondary})`
                          : "transparent",
                    }}
                    animate={{
                      scale: selectedSubcategory === subcategory.value ? 1.2 : 1,
                    }}
                    transition={{ type: "spring", damping: 15 }}
                  />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

/**
 * Visual Browser Mode Content
 */
const VisualBrowserContent = memo(function VisualBrowserContent({
  handleCategoryChange,
  selectedCategory,
  color,
  selectedSubcategory,
  setSelectedSubcategory,
}: {
  handleCategoryChange: (category: string) => void;
  selectedCategory: string;
  color: { primary: string; secondary: string; accent: string };
  selectedSubcategory?: string;
  setSelectedSubcategory?: (subcategory: string) => void;
}) {
  const handleBrowserSelect = (category: string, subcategory?: string) => {
    handleCategoryChange(category);
    if (subcategory && setSelectedSubcategory) {
      setSelectedSubcategory(subcategory);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <CategoryBrowser
        onSelect={handleBrowserSelect}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        color={color}
        showSearch={true}
        showRecents={true}
        showPopularity={true}
        variant="grid"
      />
    </motion.div>
  );
});

/**
 * SetupCategory Component
 * Handles category and subcategory selection with visual browser or simple mode
 */
const SetupCategory = ({
  categories,
  handleCategoryChange,
  selectedCategory,
  color,
  subcategories,
  selectedSubcategory,
  setSelectedSubcategory,
  useVisualBrowser = true,
}: Props) => {
  const [isVisualMode, setIsVisualMode] = useState(useVisualBrowser);

  return (
    <>
      {/* View mode toggle */}
      <ViewModeToggle
        isVisualMode={isVisualMode}
        onToggle={() => setIsVisualMode(!isVisualMode)}
        color={color}
      />

      {/* Content based on mode */}
      <AnimatePresence mode="wait">
        {isVisualMode ? (
          <VisualBrowserContent
            key="visual"
            handleCategoryChange={handleCategoryChange}
            selectedCategory={selectedCategory}
            color={color}
            selectedSubcategory={selectedSubcategory}
            setSelectedSubcategory={setSelectedSubcategory}
          />
        ) : (
          <motion.div
            key="simple"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <SimpleCategorySelector
              categories={categories}
              handleCategoryChange={handleCategoryChange}
              selectedCategory={selectedCategory}
              color={color}
              subcategories={subcategories}
              selectedSubcategory={selectedSubcategory}
              setSelectedSubcategory={setSelectedSubcategory}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SetupCategory;
