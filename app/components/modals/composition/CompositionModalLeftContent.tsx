"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Volleyball, Trophy, Users } from "lucide-react";
import { useState } from "react";
import SetupListSize from "./SetupListSize";
import SetupTimePeriod from "./SetupTimePeriod";
import SetupCategory from "./SetupCategory";

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
        className="mb-8 p-4 rounded-2xl backdrop-blur-sm relative"
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
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Custom List Name
        </label>
        <div className="relative">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter your custom ranking name..."
            className="w-full px-4 py-3 rounded-xl text-slate-200 transition-all duration-200 focus:outline-none placeholder-slate-500 backdrop-blur-sm"
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
      </motion.div>

      {/* Category Selection with enhanced styling */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <SetupCategory  
          categories={categories}
          handleCategoryChange={handleCategoryChange}
          selectedCategory={selectedCategory}
          sportsSubcategories={sportsSubcategories}
          selectedSubcategory={selectedSubcategory}
          setSelectedSubcategory={setSelectedSubcategory}
          color={color}
        />
      </motion.div>

      {/* Time Period with enhanced styling */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <SetupTimePeriod
          timePeriod={timePeriod}
          setTimePeriod={setTimePeriod}
          selectedDecade={selectedDecade}
          setSelectedDecade={setSelectedDecade}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          color={color}
        />
      </motion.div>

      {/* List Size with enhanced styling */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <SetupListSize
          hierarchyOptions={hierarchyOptions}
          handleHierarchyChange={handleHierarchyChange}
          activeHierarchy={activeHierarchy}
          color={color}
        />
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