"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  Music,
  Gamepad2,
  BookOpen,
  Image as ImageIcon,
  LucideIcon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { goatApi } from "@/lib/api";
import { topListsKeys } from "@/lib/query-keys/top-lists";
import { getCategoryColor } from "@/lib/helpers/getColors";
import { TopListItem } from "@/types/top-lists";

interface ListPreviewThumbnailProps {
  /** List ID to fetch preview images from */
  listId: string;
  /** Category for placeholder icon styling */
  category: string;
  /** Number of images to show in the mosaic (default: 4) */
  imageCount?: 3 | 4;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "row";
  /** Whether to enable hover animation */
  enableHover?: boolean;
  /** Test ID prefix */
  testIdPrefix?: string;
}

// Category-specific icons for placeholders
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  sports: Trophy,
  music: Music,
  games: Gamepad2,
  stories: BookOpen,
};

// Get icon for category with fallback
const getCategoryIcon = (category: string): LucideIcon => {
  return CATEGORY_ICONS[category.toLowerCase()] || ImageIcon;
};

// Size configurations
const SIZE_CONFIG = {
  sm: {
    container: "w-10 h-10",
    iconSize: "w-4 h-4",
    gap: "gap-0.5",
    borderRadius: "rounded-lg",
    imageClass: "w-[calc(50%-1px)] h-[calc(50%-1px)]",
  },
  md: {
    container: "w-14 h-14",
    iconSize: "w-5 h-5",
    gap: "gap-0.5",
    borderRadius: "rounded-xl",
    imageClass: "w-[calc(50%-1px)] h-[calc(50%-1px)]",
  },
  lg: {
    container: "w-20 h-20",
    iconSize: "w-7 h-7",
    gap: "gap-1",
    borderRadius: "rounded-xl",
    imageClass: "w-[calc(50%-2px)] h-[calc(50%-2px)]",
  },
  row: {
    container: "w-32 h-24 sm:w-48 sm:h-32",
    iconSize: "w-8 h-8",
    gap: "gap-1.5",
    borderRadius: "rounded-xl",
    imageClass: "h-full flex-1 min-w-0", // Flex 1 to fill width, row layout
  },
};

/**
 * Pinterest-inspired mosaic thumbnail showing top-ranked item images.
 * Falls back to category-specific placeholder icons when no images are available.
 */
export function ListPreviewThumbnail({
  listId,
  category,
  imageCount = 4,
  size = "md",
  enableHover = true,
  testIdPrefix = "list-preview-thumbnail",
}: ListPreviewThumbnailProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const colors = getCategoryColor(category);
  const CategoryIcon = getCategoryIcon(category);

  // Lazy-load list items to get images
  const { data: listData, isLoading } = useQuery({
    queryKey: topListsKeys.list(listId, true),
    queryFn: () => goatApi.lists.get(listId, true),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!listId,
    select: (data) => {
      // Extract top N items with images
      const itemsWithImages = (data.items || [])
        .filter((item: TopListItem) => item.image_url)
        .slice(0, imageCount);
      return itemsWithImages;
    },
  });

  const itemImages = listData || [];
  const hasImages = itemImages.length > 0;

  // Render placeholder with category icon
  const renderPlaceholder = () => (
    <motion.div
      className={`${sizeConfig.container} ${sizeConfig.borderRadius} flex items-center justify-center relative overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}15)`,
        border: `1px solid ${colors.primary}30`,
        boxShadow: `0 4px 12px ${colors.primary}15`,
      }}
      whileHover={enableHover ? { scale: 1.05 } : undefined}
      data-testid={`${testIdPrefix}-placeholder-${listId}`}
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 30%, ${colors.primary}40 1px, transparent 1px)`,
          backgroundSize: "8px 8px",
        }}
      />
      <CategoryIcon
        className={`${sizeConfig.iconSize} relative z-10`}
        style={{ color: colors.accent }}
      />
    </motion.div>
  );

  // Render loading skeleton
  const renderSkeleton = () => (
    <div
      className={`${sizeConfig.container} ${sizeConfig.borderRadius} overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.4))`,
      }}
      data-testid={`${testIdPrefix}-loading-${listId}`}
    >
      <div className={`w-full h-full flex flex-wrap ${sizeConfig.gap}`}>
        {Array.from({ length: imageCount }).map((_, i) => (
          <div
            key={i}
            className={`${sizeConfig.imageClass} rounded-sm animate-pulse`}
            style={{ background: "rgba(255, 255, 255, 0.05)" }}
          />
        ))}
      </div>
    </div>
  );

  // Render mosaic with images
  const renderMosaic = () => {
    // Determine grid layout based on image count available
    const displayImages = itemImages.slice(0, imageCount);
    const imagesToShow = displayImages.length;

    return (
      <motion.div
        className={`${sizeConfig.container} ${sizeConfig.borderRadius} overflow-hidden relative`}
        style={{
          background: `linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))`,
          border: `1px solid rgba(255, 255, 255, 0.1)`,
          boxShadow: `
            0 4px 12px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
        }}
        whileHover={enableHover ? { scale: 1.05 } : undefined}
        data-testid={`${testIdPrefix}-mosaic-${listId}`}
      >
        <div className={`w-full h-full flex flex-wrap ${sizeConfig.gap} p-0.5`}>
          {/* Render available images */}
          {displayImages.map((item, index) => (
            <motion.div
              key={item.id}
              className={`${sizeConfig.imageClass} ${sizeConfig.borderRadius} overflow-hidden relative`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              data-testid={`${testIdPrefix}-image-${index}-${listId}`}
            >
              <img
                src={item.image_url}
                alt={item.title || `Item ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Hide broken images
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* Subtle overlay gradient */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.2) 100%)`,
                }}
              />
            </motion.div>
          ))}

          {/* Fill remaining slots with category-colored placeholders */}
          {imagesToShow < imageCount &&
            Array.from({ length: imageCount - imagesToShow }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className={`${sizeConfig.imageClass} ${sizeConfig.borderRadius} flex items-center justify-center`}
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}10)`,
                }}
              >
                <CategoryIcon
                  className="w-1/2 h-1/2"
                  style={{ color: `${colors.accent}40` }}
                />
              </div>
            ))}
        </div>

        {/* Corner accent */}
        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 opacity-60"
          style={{
            background: `radial-gradient(circle at bottom right, ${colors.primary}40, transparent 70%)`,
          }}
        />
      </motion.div>
    );
  };

  // Loading state
  if (isLoading) {
    return renderSkeleton();
  }

  // No images available - show placeholder
  if (!hasImages) {
    return renderPlaceholder();
  }

  // Render mosaic with images
  return renderMosaic();
}

export default ListPreviewThumbnail;
