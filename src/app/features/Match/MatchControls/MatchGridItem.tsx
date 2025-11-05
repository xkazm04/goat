"use client";

import { GridItemType } from "@/types/match";
import { useMatchingContext } from "@/stores/use-list-store";
import { MatchGridImageItem } from "./MatchGridImageItem";
import { MatchGridYouTubeItem } from "./MatchGridYouTubeItem";
import { useState } from "react";

interface MatchGridItemProps {
  item: GridItemType;
  index: number;
  onClick?: () => void;
  isSelected?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function MatchGridItem({ item, index, onClick, isSelected, size = 'small' }: MatchGridItemProps) {
  // Get the current list context to determine category
  const matchingContext = useMatchingContext();
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  
  // Determine if this is a music list
  const isMusicList = matchingContext?.category === 'music';
  
  console.log(`🎵 MatchGridItem: Rendering item ${item.id} for category ${matchingContext?.category} (isMusicList: ${isMusicList})`);
  
  // Handle timestamp changes for music items
  const handleTimestampChange = (timestamp: number) => {
    setCurrentTimestamp(timestamp);
  };

  // Render appropriate component based on category
  if (isMusicList) {
    return (
      <MatchGridYouTubeItem
        item={item}
        index={index}
        onClick={onClick}
        isSelected={isSelected}
        size={size}
        currentTimestamp={currentTimestamp}
        onTimestampChange={handleTimestampChange}
      />
    );
  }

  // Default to image-based component for non-music categories
  return (
    <MatchGridImageItem
      item={item}
      index={index}
      onClick={onClick}
      isSelected={isSelected}
      size={size}
    />
  );
}