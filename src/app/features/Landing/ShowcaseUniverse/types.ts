/**
 * Type definitions for the 3D Showcase Universe feature
 */

import type { ShowcaseCardData, CardColor } from "../types";

/**
 * Category galaxies with unique visual themes
 */
export type GalaxyCategory = "Sports" | "Music" | "Games" | "Stories";

/**
 * Galaxy theme configuration
 */
export interface GalaxyTheme {
  /** Primary color for the galaxy */
  primary: string;
  /** Secondary accent color */
  secondary: string;
  /** Glow/emission color */
  glow: string;
  /** Particle color range start */
  particleColorStart: string;
  /** Particle color range end */
  particleColorEnd: string;
  /** Nebula density (0-1) */
  nebulaDensity: number;
  /** Star field intensity (0-1) */
  starIntensity: number;
}

/**
 * Position in 3D space
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 3D Card data extending showcase card data
 */
export interface Card3D extends ShowcaseCardData {
  id: string;
  position: Vector3;
  rotation: Vector3;
  scale: number;
  galaxyCategory: GalaxyCategory;
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
}

/**
 * Galaxy cluster in the universe
 */
export interface GalaxyCluster {
  category: GalaxyCategory;
  position: Vector3;
  theme: GalaxyTheme;
  cards: Card3D[];
}

/**
 * Navigation state for spatial movement
 */
export interface NavigationState {
  /** Current camera position */
  cameraPosition: Vector3;
  /** Current camera look-at target */
  cameraTarget: Vector3;
  /** Currently focused galaxy */
  focusedGalaxy: GalaxyCategory | null;
  /** Currently selected card */
  selectedCard: Card3D | null;
  /** Zoom level (0-1, where 1 is closest) */
  zoomLevel: number;
  /** Is currently transitioning */
  isTransitioning: boolean;
}

/**
 * Props for the ShowcaseUniverse component
 */
export interface ShowcaseUniverseProps {
  /** Callback when a card is clicked */
  onCardClick?: (cardData: ShowcaseCardData) => void;
  /** Whether to enable gesture controls */
  enableGestures?: boolean;
  /** Whether to enable spatial audio */
  enableAudio?: boolean;
  /** Initial galaxy to focus on */
  initialGalaxy?: GalaxyCategory;
  /** Whether to show debug information */
  debug?: boolean;
}

/**
 * Galaxy theme presets for each category
 */
export const GALAXY_THEMES: Record<GalaxyCategory, GalaxyTheme> = {
  Sports: {
    primary: "#f59e0b",
    secondary: "#d97706",
    glow: "#fbbf24",
    particleColorStart: "#f59e0b",
    particleColorEnd: "#fcd34d",
    nebulaDensity: 0.6,
    starIntensity: 0.8,
  },
  Music: {
    primary: "#ef4444",
    secondary: "#dc2626",
    glow: "#f87171",
    particleColorStart: "#ef4444",
    particleColorEnd: "#fca5a5",
    nebulaDensity: 0.7,
    starIntensity: 0.9,
  },
  Games: {
    primary: "#8b5cf6",
    secondary: "#7c3aed",
    glow: "#a78bfa",
    particleColorStart: "#8b5cf6",
    particleColorEnd: "#c4b5fd",
    nebulaDensity: 0.8,
    starIntensity: 0.85,
  },
  Stories: {
    primary: "#06b6d4",
    secondary: "#0891b2",
    glow: "#22d3ee",
    particleColorStart: "#06b6d4",
    particleColorEnd: "#67e8f9",
    nebulaDensity: 0.5,
    starIntensity: 0.75,
  },
};

/**
 * Default galaxy positions in the universe
 */
export const GALAXY_POSITIONS: Record<GalaxyCategory, Vector3> = {
  Sports: { x: -15, y: 5, z: -10 },
  Music: { x: 15, y: -3, z: -8 },
  Games: { x: -10, y: -8, z: -15 },
  Stories: { x: 12, y: 8, z: -12 },
};
