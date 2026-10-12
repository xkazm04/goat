"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CATEGORIES,
  getSubcategories,
  getDefaultSubcategory,
  categoryHasSubcategories,
} from "@/lib/config/category-config";


import SetupCategory from "./SetupCategory";
import SetupListSize from "./SetupListSize";
import SetupTimePeriod from "./SetupTimePeriod";
import { ValidatedField } from "./ValidatedField";

import type { FieldValidationState } from "@/hooks/use-field-validation";
import type { ListIntent } from "@/types/list-intent";

interface FieldValidation {
  getFieldState: (field: keyof ListIntent) => FieldValidationState;
  getBorderClass: (field: keyof ListIntent) => string;
  touchField: (field: keyof ListIntent) => void;
}

interface CompositionModalLeftContentProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedSubcategory?: string;
  setSelectedSubcategory?: (subcategory: string) => void;
  timePeriod: "all-time" | "decade" | "year";
  setTimePeriod: (period: "all-time" | "decade" | "year") => void;
  selectedDecade: number;
  setSelectedDecade: (decade: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  hierarchy: string;
  setHierarchy: (hierarchy: string) => void;
  customName: string;
  setCustomName: (name: string) => void;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  /** Field validation state — when omitted, no validation indicators shown */
  validation?: FieldValidation;
  /** Whether to auto-focus the title input on mount */
  autoFocusTitle?: boolean;
}

// Use centralized category configuration
const categories = CATEGORIES;

const hierarchyOptions = [
  { value: "Top 10", label: "Top 10", description: "Curated essentials" },
  { value: "Top 20", label: "Top 20", description: "Extended favorites" },
  { value: "Top 50", label: "Top 50", description: "Comprehensive list" }
];

export function CompositionModalLeftContent({
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory = "Basketball",
  setSelectedSubcategory,
  timePeriod,
  setTimePeriod,
  selectedDecade,
  setSelectedDecade,
  selectedYear,
  setSelectedYear,
  hierarchy,
  setHierarchy,
  customName,
  setCustomName,
  color,
  validation,
  autoFocusTitle,
}: CompositionModalLeftContentProps) {
  const [activeHierarchy, setActiveHierarchy] = useState(hierarchy);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus title input when requested
  useEffect(() => {
    if (autoFocusTitle && titleInputRef.current) {
      // Small delay to let the modal animation finish
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocusTitle]);

  const handleHierarchyChange = (newHierarchy: string) => {
    setActiveHierarchy(newHierarchy);
    setHierarchy(newHierarchy);
    validation?.touchField("size");
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    validation?.touchField("category");
    // Reset subcategory when changing main category using centralized config
    if (categoryHasSubcategories(category) && setSelectedSubcategory) {
      const defaultSub = getDefaultSubcategory(category);
      if (defaultSub) {
        setSelectedSubcategory(defaultSub);
      }
    }
  };

  const handleCustomNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomName(e.target.value);
    },
    [setCustomName]
  );

  const handleCustomNameBlur = useCallback(() => {
    validation?.touchField("title");
  }, [validation]);

  const handleTimePeriodChange = useCallback(
    (period: "all-time" | "decade" | "year") => {
      setTimePeriod(period);
      validation?.touchField("timePeriod");
    },
    [setTimePeriod, validation]
  );

  const handleDecadeChange = useCallback(
    (decade: number) => {
      setSelectedDecade(decade);
      validation?.touchField("selectedDecade");
    },
    [setSelectedDecade, validation]
  );

  const handleYearChange = useCallback(
    (year: number) => {
      setSelectedYear(year);
      validation?.touchField("selectedYear");
    },
    [setSelectedYear, validation]
  );

  // Get subcategories dynamically from config
  const currentSubcategories = getSubcategories(selectedCategory);

  return (
    <div 
      className="p-8 border-r relative overflow-hidden"
      style={{
        borderColor: `${color.primary}20`,
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.85) 0%,
            rgba(30, 41, 59, 0.9) 50%,
            rgba(15, 23, 42, 0.85) 100%
          )
        `,
        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.1), inset -1px 0 20px rgba(0, 0, 0, 0.2)`
      }}
    >
      {/* Animated background pattern */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, ${color.primary} 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
          animation: 'float 20s ease-in-out infinite'
        }}
      />

      {/* Content Header with enhanced styling */}
      <motion.div 
        className="mb-8 p-4 rounded-2xl backdrop-blur-xs relative"
        style={{
          background: `linear-gradient(135deg, ${color.primary}10, ${color.secondary}10)`,
          border: `1px solid ${color.primary}20`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 
          className="text-lg font-bold mb-2"
          style={{
            background: `linear-gradient(135deg, ${color.accent}, #ffffff)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Customize Your Ranking
        </h3>
        <p className="text-slate-400 text-sm">
          Fine-tune your list to match your vision
        </p>
      </motion.div>

      {/* Custom Name Input with enhanced styling */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ValidatedField
          fieldState={validation?.getFieldState("title") ?? { status: "untouched", errors: [] }}
          borderClass={validation?.getBorderClass("title") ?? "border-l-2 border-l-slate-600"}
        >
          <label htmlFor="custom-list-name" className="block text-sm font-medium text-slate-300 mb-3">
            Custom List Name
          </label>
          <div className="relative">
            <input
              id="custom-list-name"
              ref={titleInputRef}
              type="text"
              value={customName}
              onChange={handleCustomNameChange}
              onBlur={handleCustomNameBlur}
              placeholder="Enter your custom ranking name..."
              className="w-full px-4 py-3 rounded-xl text-slate-200 transition-all duration-200 focus:outline-hidden placeholder-slate-500 backdrop-blur-xs"
              maxLength={100}
              aria-label="Custom list name"
              aria-invalid={validation?.getFieldState("title").status === "invalid" || undefined}
              style={{
                background: `
                  linear-gradient(135deg,
                    rgba(30, 41, 59, 0.8) 0%,
                    rgba(51, 65, 85, 0.9) 100%
                  )
                `,
                border: `2px solid ${color.primary}30`,
                boxShadow: `
                  0 4px 20px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.2)
                `
              }}
            />
            {/* Glow effect on focus */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 pointer-events-none peer-focus:opacity-100"
              style={{
                background: `linear-gradient(135deg, ${color.primary}20, ${color.secondary}20)`,
                filter: 'blur(8px)'
              }}
            />
          </div>
        </ValidatedField>
      </motion.div>

      {/* Category Selection with enhanced styling */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <ValidatedField
          fieldState={validation?.getFieldState("category") ?? { status: "untouched", errors: [] }}
          borderClass={validation?.getBorderClass("category") ?? "border-l-2 border-l-slate-600"}
        >
          <SetupCategory
            categories={categories}
            handleCategoryChange={handleCategoryChange}
            selectedCategory={selectedCategory}
            subcategories={currentSubcategories}
            selectedSubcategory={selectedSubcategory}
            setSelectedSubcategory={setSelectedSubcategory}
            color={color}
          />
        </ValidatedField>
      </motion.div>

      {/* Time Period with enhanced styling */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <ValidatedField
          fieldState={validation?.getFieldState("timePeriod") ?? { status: "untouched", errors: [] }}
          borderClass={validation?.getBorderClass("timePeriod") ?? "border-l-2 border-l-slate-600"}
        >
          <SetupTimePeriod
            timePeriod={timePeriod}
            setTimePeriod={handleTimePeriodChange}
            selectedDecade={selectedDecade}
            setSelectedDecade={handleDecadeChange}
            selectedYear={selectedYear}
            setSelectedYear={handleYearChange}
            color={color}
          />
        </ValidatedField>
      </motion.div>

      {/* List Size with enhanced styling and visualizer */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <ValidatedField
          fieldState={validation?.getFieldState("size") ?? { status: "untouched", errors: [] }}
          borderClass={validation?.getBorderClass("size") ?? "border-l-2 border-l-slate-600"}
        >
          <SetupListSize
            hierarchyOptions={hierarchyOptions}
            handleHierarchyChange={handleHierarchyChange}
            activeHierarchy={activeHierarchy}
            color={color}
            category={selectedCategory}
            subcategory={selectedSubcategory}
          />
        </ValidatedField>
      </motion.div>

      {/* Bottom gradient fade */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: `linear-gradient(to top, rgba(15, 23, 42, 0.9), transparent)`
        }}
      />
    </div>
  );
}

// Add keyframes for the floating animation
const floatingAnimation = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) translateX(0px); }
    25% { transform: translateY(-10px) translateX(5px); }
    50% { transform: translateY(-5px) translateX(-5px); }
    75% { transform: translateY(-15px) translateX(3px); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = floatingAnimation;
  document.head.appendChild(style);
}