"use client";

import { categoryPreviews } from "@/app/constants/catPreview";
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
      Games: "Video games, board games, and interactive experiences that entertained and challenged us",
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
    </div>
  );
}