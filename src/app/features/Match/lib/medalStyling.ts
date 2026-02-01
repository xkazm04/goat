/**
 * Medal Styling Utilities
 * Provides consistent medal/podium styling for positions 0-2
 */

export type MedalType = 'gold' | 'silver' | 'bronze';

/**
 * Get medal type for a given position
 * @param position 0-based position
 * @returns Medal type or null if not a podium position
 */
export function getMedalType(position: number): MedalType | null {
  if (position === 0) return 'gold';
  if (position === 1) return 'silver';
  if (position === 2) return 'bronze';
  return null;
}

/**
 * Alias for getMedalType - get gradient preset name for medal positions
 */
export function getMedalGradient(position: number): MedalType | null {
  return getMedalType(position);
}

/**
 * Check if a position is a podium position (0-2)
 */
export function isMedalPosition(position: number): boolean {
  return position >= 0 && position <= 2;
}

/**
 * Medal color hints for empty slots (very subtle background tint)
 * Used to visually indicate medal positions even when empty
 */
export const MEDAL_HINT_COLORS: Record<MedalType, string> = {
  gold: 'rgba(250, 204, 21, 0.06)',    // yellow-400 at 6%
  silver: 'rgba(203, 213, 225, 0.06)', // slate-300 at 6%
  bronze: 'rgba(251, 146, 60, 0.06)',  // orange-400 at 6%
} as const;

/**
 * Medal gradient colors (full opacity)
 * For use with gradient overlays on occupied slots
 */
export const MEDAL_GRADIENT_COLORS: Record<MedalType, { primary: string; secondary: string }> = {
  gold: {
    primary: '#facc15',  // yellow-400
    secondary: '#eab308', // yellow-500
  },
  silver: {
    primary: '#cbd5e1',  // slate-300
    secondary: '#94a3b8', // slate-400
  },
  bronze: {
    primary: '#fb923c',  // orange-400
    secondary: '#f97316', // orange-500
  },
} as const;

/**
 * Medal glow colors (for shadow effects)
 */
export const MEDAL_GLOW_COLORS: Record<MedalType, string> = {
  gold: 'rgba(250, 204, 21, 0.4)',    // yellow-400 at 40%
  silver: 'rgba(203, 213, 225, 0.4)', // slate-300 at 40%
  bronze: 'rgba(251, 146, 60, 0.4)',  // orange-400 at 40%
} as const;

/**
 * Get complete medal styling configuration for a position
 */
export function getMedalStyling(position: number) {
  const medalType = getMedalType(position);

  if (!medalType) {
    return null;
  }

  return {
    type: medalType,
    hintColor: MEDAL_HINT_COLORS[medalType],
    gradientColors: MEDAL_GRADIENT_COLORS[medalType],
    glowColor: MEDAL_GLOW_COLORS[medalType],
    borderWidth: position === 0 ? 3 : 2, // Thicker border for #1
  };
}

/**
 * Get background style for empty medal slots
 */
export function getEmptyMedalBackground(position: number): React.CSSProperties | undefined {
  const medalType = getMedalType(position);
  if (!medalType) return undefined;

  return {
    backgroundColor: MEDAL_HINT_COLORS[medalType],
  };
}
