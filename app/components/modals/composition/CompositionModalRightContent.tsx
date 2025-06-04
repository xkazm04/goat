"use client";

import { categoryPreviews } from "@/app/constants/catPreview";
import { motion } from "framer-motion";
import { Twitter, Zap} from "lucide-react";
import Image from "next/image";
import SetupPreview from "./SetupPreview";

interface CompositionModalRightContentProps {
  selectedCategory: string;
  selectedSubcategory?: string;
  timePeriod: "all-time" | "decade" | "year";
  selectedDecade: number;
  selectedYear: number;
  hierarchy: string;
  customName: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}



export function CompositionModalRightContent({
  selectedCategory,
  selectedSubcategory = "Basketball",
  timePeriod,
  selectedDecade,
  selectedYear,
  hierarchy,
  customName,
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

  const getDisplayName = () => {
    if (customName) return customName;
    if (selectedCategory === "Sports" && selectedSubcategory) {
      return `${hierarchy} ${selectedSubcategory} Rankings`;
    }
    return `${hierarchy} ${selectedCategory} Rankings`;
  };


  return (
    <div
      className="p-8 flex flex-col relative overflow-auto"
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.9) 0%,
            rgba(30, 41, 59, 0.95) 100%
          )
        `
      }}
    >
      <Image
        src="/gifs/roach.gif"
        alt="GOAT Logo"
        fill
        className="object-cover opacity-5"
        priority
      />
      
      <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: color.accent }}
        />
        Preview
      </h3>

      <SetupPreview
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        timePeriod={timePeriod}
        selectedDecade={selectedDecade}
        selectedYear={selectedYear}
        hierarchy={hierarchy}
        customName={customName}
        color={color}
        getCategoryDescription={getCategoryDescription}
        getDisplayName={getDisplayName}
        categoryPreviews={categoryPreviews}
      />


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