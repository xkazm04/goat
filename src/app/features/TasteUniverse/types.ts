/**
 * Type definitions for the 3D Taste Universe feature
 * An immersive spatial ranking experience
 */

import type { ShowcaseCardData, CardColor } from "../Landing/types";

/**
 * Category constellations with unique visual themes
 */
export type ConstellationCategory = "Sports" | "Music" | "Games" | "Stories";

/**
 * Position in 3D space
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Star brightness based on ranking position
 */
export type StarBrightness = "bright" | "medium" | "dim" | "faint";

/**
 * Individual star (ranked item) in a constellation
 */
export interface Star {
  id: string;
  itemId: string;
  name: string;
  position: Vector3;
  brightness: StarBrightness;
  rank: number;
  color: string;
  size: number;
  pulseSpeed: number;
  metadata?: {
    category?: string;
    subcategory?: string;
    imageUrl?: string;
  };
}

/**
 * Connection between related stars
 */
export interface StarConnection {
  id: string;
  fromStarId: string;
  toStarId: string;
  strength: number; // 0-1 based on similarity
  color: string;
  animated: boolean;
}

/**
 * Constellation (ranked list) configuration
 */
export interface Constellation {
  id: string;
  name: string;
  category: ConstellationCategory;
  position: Vector3;
  stars: Star[];
  connections: StarConnection[];
  theme: ConstellationTheme;
  listId: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
}

/**
 * Visual theme for constellations
 */
export interface ConstellationTheme {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  nebulaColor: string;
  particleDensity: number;
  connectionOpacity: number;
}

/**
 * User's taste universe configuration
 */
export interface TasteUniverse {
  id: string;
  userId: string;
  userName: string;
  constellations: Constellation[];
  cameraPosition: Vector3;
  theme: UniverseTheme;
  stats: UniverseStats;
  isPublic: boolean;
}

/**
 * Universe visual theme
 */
export interface UniverseTheme {
  backgroundColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  ambientLightIntensity: number;
  starFieldDensity: number;
  nebulaEnabled: boolean;
}

/**
 * Universe statistics
 */
export interface UniverseStats {
  totalConstellations: number;
  totalStars: number;
  totalConnections: number;
  topCategories: ConstellationCategory[];
}

/**
 * Spatial ranking state
 */
export interface SpatialRankingState {
  isActive: boolean;
  selectedStar: Star | null;
  draggedStar: Star | null;
  previewPosition: Vector3 | null;
  targetRank: number | null;
}

/**
 * Camera navigation state
 */
export interface CameraState {
  position: Vector3;
  target: Vector3;
  zoom: number;
  isTransitioning: boolean;
  focusedConstellation: string | null;
  focusedStar: string | null;
}

/**
 * AR mode state
 */
export interface ARState {
  isSupported: boolean;
  isActive: boolean;
  sessionStarted: boolean;
  anchors: ARStar[];
}

/**
 * AR-anchored star
 */
export interface ARStar extends Star {
  worldPosition: Vector3;
  isAnchored: boolean;
}

/**
 * Social features state
 */
export interface SocialState {
  currentUserId: string | null;
  visitingUserId: string | null;
  isVisiting: boolean;
  sharedUniverses: TasteUniverse[];
}

/**
 * Props for the TasteUniverse component
 */
export interface TasteUniverseProps {
  /** User's lists/rankings to display */
  userLists?: UserList[];
  /** Current user ID */
  userId?: string;
  /** Visit another user's universe */
  visitUserId?: string;
  /** Enable spatial ranking mode */
  enableSpatialRanking?: boolean;
  /** Enable AR mode */
  enableAR?: boolean;
  /** Enable social features */
  enableSocial?: boolean;
  /** Callback when ranking changes */
  onRankingChange?: (listId: string, newOrder: string[]) => void;
  /** Callback when visiting another universe */
  onVisitUniverse?: (userId: string) => void;
  /** Debug mode */
  debug?: boolean;
}

/**
 * User list for universe generation
 */
export interface UserList {
  id: string;
  name: string;
  category: string;
  items: UserListItem[];
  authorId?: string;
  authorName?: string;
}

/**
 * User list item
 */
export interface UserListItem {
  id: string;
  name: string;
  rank: number;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Constellation theme presets
 */
export const CONSTELLATION_THEMES: Record<ConstellationCategory, ConstellationTheme> = {
  Sports: {
    primaryColor: "#f59e0b",
    secondaryColor: "#d97706",
    glowColor: "#fbbf24",
    nebulaColor: "#f59e0b",
    particleDensity: 0.7,
    connectionOpacity: 0.5,
  },
  Music: {
    primaryColor: "#ef4444",
    secondaryColor: "#dc2626",
    glowColor: "#f87171",
    nebulaColor: "#ef4444",
    particleDensity: 0.8,
    connectionOpacity: 0.6,
  },
  Games: {
    primaryColor: "#8b5cf6",
    secondaryColor: "#7c3aed",
    glowColor: "#a78bfa",
    nebulaColor: "#8b5cf6",
    particleDensity: 0.9,
    connectionOpacity: 0.55,
  },
  Stories: {
    primaryColor: "#06b6d4",
    secondaryColor: "#0891b2",
    glowColor: "#22d3ee",
    nebulaColor: "#06b6d4",
    particleDensity: 0.6,
    connectionOpacity: 0.45,
  },
};

/**
 * Default constellation positions in 3D space (spread in a sphere)
 */
export const CONSTELLATION_POSITIONS: Record<ConstellationCategory, Vector3> = {
  Sports: { x: -20, y: 10, z: -15 },
  Music: { x: 20, y: 5, z: -10 },
  Games: { x: -15, y: -10, z: -20 },
  Stories: { x: 15, y: -5, z: -25 },
};

/**
 * Default universe theme
 */
export const DEFAULT_UNIVERSE_THEME: UniverseTheme = {
  backgroundColor: "#030712",
  fogColor: "#030712",
  fogNear: 50,
  fogFar: 200,
  ambientLightIntensity: 0.2,
  starFieldDensity: 3000,
  nebulaEnabled: true,
};

/**
 * Get star brightness based on rank
 */
export function getStarBrightness(rank: number, totalItems: number): StarBrightness {
  const ratio = rank / totalItems;
  if (ratio <= 0.1) return "bright";
  if (ratio <= 0.3) return "medium";
  if (ratio <= 0.6) return "dim";
  return "faint";
}

/**
 * Get star size based on rank and brightness
 */
export function getStarSize(rank: number, totalItems: number): number {
  const brightness = getStarBrightness(rank, totalItems);
  switch (brightness) {
    case "bright":
      return 0.8 + (1 - rank / totalItems) * 0.4;
    case "medium":
      return 0.5 + (1 - rank / totalItems) * 0.3;
    case "dim":
      return 0.3 + (1 - rank / totalItems) * 0.2;
    case "faint":
    default:
      return 0.2;
  }
}

/**
 * Calculate spiral position for stars in a constellation
 */
export function calculateSpiralPosition(
  rank: number,
  totalItems: number,
  centerPosition: Vector3
): Vector3 {
  // Golden angle for natural spiral distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const angle = rank * goldenAngle;

  // Distance from center based on rank (top ranks closer to center)
  const distanceFactor = Math.sqrt(rank / totalItems);
  const maxDistance = 8;
  const distance = distanceFactor * maxDistance;

  // Vertical offset for 3D effect
  const verticalSpread = 4;
  const y = (rank / totalItems - 0.5) * verticalSpread;

  return {
    x: centerPosition.x + Math.cos(angle) * distance,
    y: centerPosition.y + y,
    z: centerPosition.z + Math.sin(angle) * distance,
  };
}
