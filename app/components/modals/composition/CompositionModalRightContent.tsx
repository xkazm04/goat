"use client";

import { motion } from "framer-motion";
import { Sparkles, Twitter, Zap } from "lucide-react";

interface CompositionModalRightContentProps {
  selectedCategory: string;
  timePeriod: "all-time" | "decade" | "year";
  selectedDecade: number;
  selectedYear: number;
  hierarchy: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export function CompositionModalRightContent({
  selectedCategory,
  timePeriod,
  selectedDecade,
  selectedYear,
  hierarchy,
  color
}: CompositionModalRightContentProps) {
  const getCategoryDescription = () => {
    const descriptions = {
      Sports: "Athletes, teams, moments, and achievements that defined sporting excellence",
      Music: "Artists, albums, songs, and performances that shaped musical history", 
      Games: "Video games, franchises, characters, and innovations that revolutionized gaming",
      Stories: "Books, movies, shows, and narratives that captured our imagination"
    };
    return descriptions[selectedCategory as keyof typeof descriptions] || "";
  };

  return (
    <div 
      className="p-8 flex flex-col"
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.9) 0%,
            rgba(30, 41, 59, 0.95) 100%
          )
        `
      }}
    >
      <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
        <div 
          className="w-2 h-2 rounded-full"
          style={{ background: color.accent }}
        />
        Preview
      </h3>

      {/* Format Description */}
      <div 
        className="p-4 rounded-xl mb-6"
        style={{
          background: `linear-gradient(135deg, ${color.primary}10, ${color.secondary}10)`,
          border: `1px solid ${color.primary}30`
        }}
      >
        <h4 className="font-semibold text-slate-200 mb-2">
          {hierarchy} {selectedCategory} Rankings
        </h4>
        <p className="text-sm text-slate-400 leading-relaxed">
          {getCategoryDescription()}
          {timePeriod === "decade" && ` from the ${selectedDecade}s`}
          {timePeriod === "year" && ` from ${selectedYear}`}
          {timePeriod === "all-time" && ` across all eras`}.
        </p>
      </div>

      {/* Preview Block */}
      <div 
        className="flex-1 rounded-2xl border-2 border-dashed p-8 mb-6 flex items-center justify-center"
        style={{
          borderColor: `${color.primary}40`,
          background: `linear-gradient(135deg, ${color.primary}05, ${color.secondary}05)`
        }}
      >
        <div className="text-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: `linear-gradient(135deg, ${color.primary}20, ${color.secondary}20)`
            }}
          >
            <Sparkles 
              className="w-8 h-8"
              style={{ color: color.accent }}
            />
          </div>
          <h4 className="font-semibold text-slate-300 mb-2">
            Preview Coming Soon
          </h4>
          <p className="text-sm text-slate-500">
            Visual preview will be available here
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-6 py-4 rounded-xl font-bold text-white transition-all duration-200 flex items-center justify-center gap-3"
          style={{
            background: `linear-gradient(135deg, ${color.primary}80, ${color.secondary}80)`,
            boxShadow: `0 4px 15px ${color.primary}30`
          }}
        >
          <Zap className="w-5 h-5" />
          Generate Rankings
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 text-slate-300 hover:text-slate-200"
          style={{
            background: 'rgba(51, 65, 85, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.4)'
          }}
        >
          <Twitter className="w-4 h-4" />
          Sign in with Twitter
        </motion.button>
      </div>
    </div>
  );
}