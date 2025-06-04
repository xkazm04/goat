"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Volleyball, Trophy, Users } from "lucide-react";
import { useState } from "react";
import SetupListSize from "./SetupListSize";
import SetupTimePeriod from "./SetupTimePeriod";
import SetupCategory from "./SetupCategory";
import SetupHeader from "./SetupHeader";

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
  isPredefined: boolean;
  setIsPredefined: (predefined: boolean) => void;
  customName: string;
  setCustomName: (name: string) => void;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const categories = ["Sports", "Music", "Games", "Stories"];

const sportsSubcategories = [
  { value: "Basketball", label: "Basketball", icon: Volleyball },
  { value: "Ice-Hockey", label: "Ice Hockey", icon: Trophy },
  { value: "Soccer", label: "Soccer", icon: Users }
];

const hierarchyOptions = [
  { value: "Top 10", label: "Top 10", description: "Curated essentials" },
  { value: "Top 20", label: "Top 20", description: "Extended favorites" },
  { value: "Top 50", label: "Top 50", description: "Comprehensive list" }
];

const decades = [1980, 1990, 2000, 2010, 2020];

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
  isPredefined,
  setIsPredefined,
  customName,
  setCustomName,
  color
}: CompositionModalLeftContentProps) {
  const [activeHierarchy, setActiveHierarchy] = useState(hierarchy);

  const handleHierarchyChange = (newHierarchy: string) => {
    setActiveHierarchy(newHierarchy);
    setHierarchy(newHierarchy);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // Reset subcategory when changing main category
    if (category === "Sports" && setSelectedSubcategory) {
      setSelectedSubcategory("Basketball");
    }
  };

  return (
    <div 
      className="p-8 border-r"
      style={{
        borderColor: `${color.primary}20`,
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.7) 0%,
            rgba(30, 41, 59, 0.8) 100%
          )
        `
      }}
    >
      <SetupHeader
        isPredefined={isPredefined}
        setIsPredefined={setIsPredefined}
        color={color}
        />

      {/* Custom Name Input */}
      <AnimatePresence>
        {!isPredefined && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Custom List Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter your custom ranking name..."
              className="w-full px-4 py-3 rounded-xl text-slate-200 transition-all duration-200 focus:outline-none placeholder-slate-500"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(30, 41, 59, 0.9) 0%,
                    rgba(51, 65, 85, 0.95) 100%
                  )
                `,
                border: `2px solid ${color.primary}40`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Selection */}
      <SetupCategory  
        categories={categories}
        handleCategoryChange={handleCategoryChange}
        isPredefined={isPredefined}
        selectedCategory={selectedCategory}
        sportsSubcategories={sportsSubcategories}
        selectedSubcategory={selectedSubcategory}
        setSelectedSubcategory={setSelectedSubcategory}
        color={color}
        />

      {/* Time Period */}
      <SetupTimePeriod
        timePeriod={timePeriod}
        setTimePeriod={setTimePeriod}
        selectedDecade={selectedDecade}
        setSelectedDecade={setSelectedDecade}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        isPredefined={isPredefined}
        color={color}
        hierarchyOptions={hierarchyOptions}
        handleHierarchyChange={handleHierarchyChange}
        activeHierarchy={activeHierarchy}
        />

      {/* Enhanced List Size Selection */}
      <SetupListSize
        hierarchyOptions={hierarchyOptions}
        handleHierarchyChange={handleHierarchyChange}
        activeHierarchy={activeHierarchy}
        isPredefined={isPredefined}
        color={color}
        />
    </div>
  );
}