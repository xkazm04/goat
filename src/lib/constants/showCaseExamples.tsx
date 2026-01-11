import { Trophy, Music, Gamepad2, Film, Book, LucideIcon } from "lucide-react";
import { Blueprint, BlueprintColor } from "@/types/blueprint";
import type { ShowcaseCardData, TimePeriod } from "@/app/features/Landing/types";

// Display-specific properties for showcase cards (not stored in database)
export interface ShowcaseDisplayProps {
  position: { x: number; y: number };
  rotation: number;
  scale: number;
  icon: LucideIcon;
}

// Combined type for showcase rendering
export interface ShowcaseBlueprint extends Blueprint {
  displayProps: ShowcaseDisplayProps;
}

// Category to icon mapping
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Sports: Trophy,
  Games: Gamepad2,
  Music: Music,
  Stories: Film,
  default: Book,
};

// Get icon for a category
export function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.default;
}

// System blueprints with display properties for the floating showcase
// These are the hardcoded defaults that are also seeded in the database
export const SYSTEM_BLUEPRINTS: ShowcaseBlueprint[] = [
  {
    id: "system-showcase-1",
    slug: "top-50-nba-players-system-1",
    title: "Top 50 NBA Players",
    category: "Sports",
    subcategory: "basketball",
    size: 50,
    timePeriod: "all-time",
    description: "never lost in finals",
    author: "@mbj",
    color: {
      primary: "#f59e0b",
      secondary: "#d97706",
      accent: "#fbbf24",
    },
    isSystem: true,
    isFeatured: true,
    displayProps: {
      position: { x: 10, y: 20 },
      rotation: -5,
      scale: 1.0,
      icon: Trophy,
    },
  },
  {
    id: "system-showcase-2",
    slug: "best-pc-games-to-play-system-2",
    title: "Best PC Games to play",
    category: "Games",
    subcategory: "video-games",
    size: 50,
    timePeriod: "all-time",
    description: "timeless classics that changed everything",
    author: "@gamer_pro",
    color: {
      primary: "#8b5cf6",
      secondary: "#7c3aed",
      accent: "#a78bfa",
    },
    isSystem: true,
    isFeatured: true,
    displayProps: {
      position: { x: 65, y: 15 },
      rotation: 3,
      scale: 0.9,
      icon: Gamepad2,
    },
  },
  {
    id: "system-showcase-3",
    slug: "top-hip-hop-tracks-system-3",
    title: "Top Hip-Hop Tracks",
    category: "Music",
    subcategory: "hip-hop",
    size: 50,
    timePeriod: "all-time",
    description: "beats that defined generations",
    author: "@music_head",
    color: {
      primary: "#ef4444",
      secondary: "#dc2626",
      accent: "#f87171",
    },
    isSystem: true,
    isFeatured: true,
    isBanned: true,
    displayProps: {
      position: { x: 20, y: 60 },
      rotation: 2,
      scale: 1.1,
      icon: Music,
    },
  },
  {
    id: "system-showcase-4",
    slug: "sci-fi-masterpieces-system-4",
    title: "Sci-Fi Masterpieces",
    category: "Stories",
    subcategory: "sci-fi",
    size: 50,
    timePeriod: "all-time",
    description: "mind-bending cinema at its finest",
    author: "@film_buff",
    color: {
      primary: "#06b6d4",
      secondary: "#0891b2",
      accent: "#22d3ee",
    },
    isSystem: true,
    isFeatured: true,
    displayProps: {
      position: { x: 70, y: 65 },
      rotation: -3,
      scale: 0.85,
      icon: Film,
    },
  },
  {
    id: "system-showcase-5",
    slug: "fantasy-novels-system-5",
    title: "Fantasy Novels",
    category: "Stories",
    subcategory: "fantasy",
    size: 50,
    timePeriod: "all-time",
    description: "worlds beyond imagination",
    author: "@book_worm",
    color: {
      primary: "#10b981",
      secondary: "#059669",
      accent: "#34d399",
    },
    isSystem: true,
    isFeatured: true,
    displayProps: {
      position: { x: 45, y: 40 },
      rotation: 1,
      scale: 0.95,
      icon: Book,
    },
  },
];

// Legacy format adapter for backward compatibility
// Maps the new Blueprint format to the old showcase data format
// Extends ShowcaseCardData to ensure consistent field naming (including "hierarchy")
export interface LegacyShowcaseItem extends ShowcaseCardData {
  id: number;
  icon: LucideIcon;
  color: BlueprintColor;
  timePeriod: TimePeriod;
  position: { x: number; y: number };
  rotation: number;
  scale: number;
  isBanned?: boolean;
}

// Convert ShowcaseBlueprint to legacy format
export function blueprintToLegacyFormat(blueprint: ShowcaseBlueprint, index: number): LegacyShowcaseItem {
  return {
    id: index + 1,
    category: blueprint.category,
    subcategory: blueprint.subcategory,
    title: blueprint.title,
    author: blueprint.author || "@anonymous",
    comment: blueprint.description || "",
    icon: blueprint.displayProps.icon,
    color: blueprint.color,
    timePeriod: blueprint.timePeriod,
    hierarchy: `Top ${blueprint.size}`,
    position: blueprint.displayProps.position,
    rotation: blueprint.displayProps.rotation,
    scale: blueprint.displayProps.scale,
    isBanned: blueprint.isBanned,
  };
}

// Export legacy format for backward compatibility with existing components
export const showcaseData = SYSTEM_BLUEPRINTS.map(blueprintToLegacyFormat);

// Assign default display properties to a Blueprint for showcase rendering
export function assignDisplayProps(
  blueprint: Blueprint,
  displayProps?: Partial<ShowcaseDisplayProps>
): ShowcaseBlueprint {
  const icon = getCategoryIcon(blueprint.category);

  return {
    ...blueprint,
    displayProps: {
      position: displayProps?.position || { x: 50, y: 50 },
      rotation: displayProps?.rotation || 0,
      scale: displayProps?.scale || 1.0,
      icon: displayProps?.icon || icon,
    },
  };
}