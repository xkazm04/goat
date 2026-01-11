import { Trophy, Medal, LucideIcon } from "lucide-react";

/**
 * Rank configuration for grid positions
 * Pre-computed as a lookup object for O(1) access during drag operations.
 * Eliminates per-render computation overhead for 50+ grid slots.
 */
export interface RankConfig {
  color: string;
  glow: string;
  icon: LucideIcon | null;
  label: string;
}

/**
 * Pre-computed rank configurations for podium positions (0-2)
 * These never change and are accessed frequently during drag operations.
 */
const PODIUM_CONFIGS: Record<number, RankConfig> = {
  0: { color: '#FFD700', glow: 'shadow-yellow-500/50', icon: Trophy, label: 'CHAMPION' },
  1: { color: '#C0C0C0', glow: 'shadow-slate-400/50', icon: Medal, label: '2ND PLACE' },
  2: { color: '#CD7F32', glow: 'shadow-orange-700/50', icon: Medal, label: '3RD PLACE' },
};

/**
 * Default configuration for non-podium positions
 */
const DEFAULT_CONFIG: Omit<RankConfig, 'label'> = {
  color: '#22d3ee',
  glow: 'shadow-cyan-500/30',
  icon: null,
};

/**
 * Cache for non-podium rank configs to avoid label string recreation
 */
const rankConfigCache = new Map<number, RankConfig>();

/**
 * Get rank configuration for a grid position.
 * Uses pre-computed lookup for podium positions (0-2) and caches others.
 *
 * @param position - Zero-based grid position
 * @returns RankConfig with color, glow, icon, and label
 */
export function getRankConfig(position: number): RankConfig {
  // Fast path: podium positions use pre-computed configs
  if (position in PODIUM_CONFIGS) {
    return PODIUM_CONFIGS[position];
  }

  // Check cache for non-podium positions
  const cached = rankConfigCache.get(position);
  if (cached) {
    return cached;
  }

  // Create and cache config for this position
  const config: RankConfig = {
    ...DEFAULT_CONFIG,
    label: `#${position + 1}`,
  };
  rankConfigCache.set(position, config);

  return config;
}

/**
 * Get just the rank color for a position.
 * Lightweight alternative when only color is needed.
 *
 * @param position - Zero-based grid position
 * @returns Hex color string
 */
export function getRankColor(position: number): string {
  if (position === 0) return '#FFD700'; // Gold
  if (position === 1) return '#C0C0C0'; // Silver
  if (position === 2) return '#CD7F32'; // Bronze
  return '#22d3ee'; // Cyan for others
}

/**
 * Check if a position is a podium position (top 3)
 *
 * @param position - Zero-based grid position
 * @returns true if position is 0, 1, or 2
 */
export function isPodiumPosition(position: number): boolean {
  return position < 3;
}

/**
 * Rank color constants for direct access in styling
 */
export const RANK_COLORS = {
  GOLD: '#FFD700',
  SILVER: '#C0C0C0',
  BRONZE: '#CD7F32',
  DEFAULT: '#22d3ee',
} as const;

/**
 * Confetti color themes by position for DropCelebration
 */
export const CONFETTI_THEMES: Record<number, readonly string[]> = {
  0: ['#FFD700', '#FFA500', '#FFE55C', '#FFEC8B', '#FFFFFF'] as const, // Gold theme
  1: ['#C0C0C0', '#E8E8E8', '#A0A0A0', '#FFFFFF', '#D4D4D4'] as const, // Silver theme
  2: ['#CD7F32', '#E8A060', '#D4A056', '#FFD700', '#FFFFFF'] as const, // Bronze theme
} as const;

/**
 * Get confetti colors for a position
 *
 * @param position - Zero-based grid position
 * @returns Array of hex color strings for confetti
 */
export function getConfettiColors(position: number): readonly string[] {
  return CONFETTI_THEMES[position] ?? CONFETTI_THEMES[0];
}
