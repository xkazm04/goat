/**
 * Tier Configuration
 * Centralized tier definitions with visual properties for position-aware smart grid
 */

/**
 * Tier identifiers
 */
export type TierId = 'elite' | 'core' | 'rising' | 'reserves';

/**
 * Tier definition with visual properties
 */
export interface TierDefinition {
  id: TierId;
  name: string;
  displayName: string;
  description: string;
  /** Position range (0-indexed) */
  range: {
    start: number;
    end: number;
  };
  /** Visual styling */
  style: {
    /** Background gradient */
    gradient: string;
    /** Border/accent color */
    accentColor: string;
    /** Glow color for items */
    glowColor: string;
    /** Text color for labels */
    textColor: string;
    /** Scale factor for items (1.0 = normal) */
    scale: number;
    /** Badge color */
    badgeColor: string;
    /** Shadow intensity (0-1) */
    shadowIntensity: number;
  };
  /** Layout configuration */
  layout: {
    /** Number of columns at different breakpoints */
    columns: {
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    /** Gap between items (in pixels or tailwind scale) */
    gap: number;
    /** Whether to show position badges */
    showBadges: boolean;
    /** Whether items can be collapsed */
    collapsible: boolean;
  };
  /** Animation configuration */
  animation: {
    /** Entry animation delay multiplier */
    staggerDelay: number;
    /** Hover scale */
    hoverScale: number;
    /** Drop animation spring stiffness */
    dropStiffness: number;
    /** Drop animation damping */
    dropDamping: number;
  };
}

/**
 * Default tier configurations for a standard 50-position grid
 */
export const DEFAULT_TIERS: TierDefinition[] = [
  {
    id: 'elite',
    name: 'Elite Tier',
    displayName: 'Elite',
    description: 'The absolute best - legendary status',
    range: { start: 0, end: 10 },
    style: {
      gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      accentColor: '#f59e0b', // amber-500
      glowColor: 'rgba(245, 158, 11, 0.4)',
      textColor: 'text-amber-400',
      scale: 1.05,
      badgeColor: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      shadowIntensity: 0.8,
    },
    layout: {
      columns: { sm: 3, md: 5, lg: 7, xl: 7 },
      gap: 4,
      showBadges: true,
      collapsible: false,
    },
    animation: {
      staggerDelay: 0.08,
      hoverScale: 1.08,
      dropStiffness: 400,
      dropDamping: 25,
    },
  },
  {
    id: 'core',
    name: 'Core Roster',
    displayName: 'Core',
    description: 'Reliable performers - the backbone',
    range: { start: 10, end: 20 },
    style: {
      gradient: 'from-cyan-500/15 via-blue-500/10 to-transparent',
      accentColor: '#06b6d4', // cyan-500
      glowColor: 'rgba(6, 182, 212, 0.3)',
      textColor: 'text-cyan-400',
      scale: 1.0,
      badgeColor: 'bg-gradient-to-r from-cyan-500 to-blue-400',
      shadowIntensity: 0.5,
    },
    layout: {
      columns: { sm: 4, md: 6, lg: 10, xl: 10 },
      gap: 3,
      showBadges: true,
      collapsible: true,
    },
    animation: {
      staggerDelay: 0.05,
      hoverScale: 1.05,
      dropStiffness: 350,
      dropDamping: 28,
    },
  },
  {
    id: 'rising',
    name: 'Rising Stars',
    displayName: 'Rising',
    description: 'Up-and-comers with potential',
    range: { start: 20, end: 35 },
    style: {
      gradient: 'from-purple-500/10 via-violet-500/5 to-transparent',
      accentColor: '#a855f7', // purple-500
      glowColor: 'rgba(168, 85, 247, 0.25)',
      textColor: 'text-purple-400',
      scale: 0.95,
      badgeColor: 'bg-gradient-to-r from-purple-500 to-violet-400',
      shadowIntensity: 0.3,
    },
    layout: {
      columns: { sm: 5, md: 7, lg: 10, xl: 10 },
      gap: 3,
      showBadges: true,
      collapsible: true,
    },
    animation: {
      staggerDelay: 0.04,
      hoverScale: 1.04,
      dropStiffness: 300,
      dropDamping: 30,
    },
  },
  {
    id: 'reserves',
    name: 'Reserves',
    displayName: 'Reserves',
    description: 'Depth picks - still made the list',
    range: { start: 35, end: 50 },
    style: {
      gradient: 'from-slate-500/10 via-gray-500/5 to-transparent',
      accentColor: '#64748b', // slate-500
      glowColor: 'rgba(100, 116, 139, 0.2)',
      textColor: 'text-slate-400',
      scale: 0.9,
      badgeColor: 'bg-gradient-to-r from-slate-500 to-gray-400',
      shadowIntensity: 0.2,
    },
    layout: {
      columns: { sm: 5, md: 8, lg: 10, xl: 10 },
      gap: 2,
      showBadges: false,
      collapsible: true,
    },
    animation: {
      staggerDelay: 0.03,
      hoverScale: 1.03,
      dropStiffness: 280,
      dropDamping: 32,
    },
  },
];

/**
 * Get tier for a given position
 */
export function getTierForPosition(position: number, tiers: TierDefinition[] = DEFAULT_TIERS): TierDefinition | null {
  return tiers.find(tier => position >= tier.range.start && position < tier.range.end) || null;
}

/**
 * Get tier ID for a given position
 */
export function getTierIdForPosition(position: number, tiers: TierDefinition[] = DEFAULT_TIERS): TierId | null {
  const tier = getTierForPosition(position, tiers);
  return tier?.id || null;
}

/**
 * Check if position is at a tier boundary (last position in tier)
 */
export function isAtTierBoundary(position: number, tiers: TierDefinition[] = DEFAULT_TIERS): boolean {
  return tiers.some(tier => position === tier.range.end - 1);
}

/**
 * Check if position is the first in its tier
 */
export function isFirstInTier(position: number, tiers: TierDefinition[] = DEFAULT_TIERS): boolean {
  return tiers.some(tier => position === tier.range.start);
}

/**
 * Get next tier up (for promotion)
 */
export function getNextTierUp(currentTier: TierId, tiers: TierDefinition[] = DEFAULT_TIERS): TierDefinition | null {
  const currentIndex = tiers.findIndex(t => t.id === currentTier);
  if (currentIndex <= 0) return null;
  return tiers[currentIndex - 1];
}

/**
 * Get next tier down (for demotion)
 */
export function getNextTierDown(currentTier: TierId, tiers: TierDefinition[] = DEFAULT_TIERS): TierDefinition | null {
  const currentIndex = tiers.findIndex(t => t.id === currentTier);
  if (currentIndex === -1 || currentIndex >= tiers.length - 1) return null;
  return tiers[currentIndex + 1];
}

/**
 * Get CSS custom properties for a tier
 */
export function getTierCSSProperties(tier: TierDefinition): Record<string, string> {
  return {
    '--tier-accent': tier.style.accentColor,
    '--tier-glow': tier.style.glowColor,
    '--tier-scale': String(tier.style.scale),
    '--tier-shadow-intensity': String(tier.style.shadowIntensity),
    '--tier-hover-scale': String(tier.animation.hoverScale),
    '--tier-stagger': `${tier.animation.staggerDelay}s`,
  };
}

/**
 * Adjust tiers for a custom grid size
 */
export function adjustTiersForSize(listSize: number): TierDefinition[] {
  if (listSize <= 10) {
    // Small list: just elite tier
    return [
      { ...DEFAULT_TIERS[0], range: { start: 0, end: listSize } },
    ];
  }

  if (listSize <= 20) {
    // Medium list: elite + core
    return [
      { ...DEFAULT_TIERS[0], range: { start: 0, end: Math.ceil(listSize * 0.3) } },
      { ...DEFAULT_TIERS[1], range: { start: Math.ceil(listSize * 0.3), end: listSize } },
    ];
  }

  if (listSize <= 35) {
    // Larger list: elite + core + rising
    const eliteEnd = Math.ceil(listSize * 0.2);
    const coreEnd = Math.ceil(listSize * 0.5);
    return [
      { ...DEFAULT_TIERS[0], range: { start: 0, end: eliteEnd } },
      { ...DEFAULT_TIERS[1], range: { start: eliteEnd, end: coreEnd } },
      { ...DEFAULT_TIERS[2], range: { start: coreEnd, end: listSize } },
    ];
  }

  // Full 4-tier system for 36+ items
  const eliteEnd = Math.ceil(listSize * 0.2);
  const coreEnd = Math.ceil(listSize * 0.4);
  const risingEnd = Math.ceil(listSize * 0.7);
  return [
    { ...DEFAULT_TIERS[0], range: { start: 0, end: eliteEnd } },
    { ...DEFAULT_TIERS[1], range: { start: eliteEnd, end: coreEnd } },
    { ...DEFAULT_TIERS[2], range: { start: coreEnd, end: risingEnd } },
    { ...DEFAULT_TIERS[3], range: { start: risingEnd, end: listSize } },
  ];
}

/**
 * Position styling helpers
 */
export const POSITION_STYLES = {
  /** Gold medal positions (1-3) */
  podium: {
    1: { color: '#ffd700', label: '1st', icon: '🥇' },
    2: { color: '#c0c0c0', label: '2nd', icon: '🥈' },
    3: { color: '#cd7f32', label: '3rd', icon: '🥉' },
  },
  /** Special position badges */
  badges: {
    top5: { color: '#f59e0b', label: 'Top 5' },
    top10: { color: '#06b6d4', label: 'Top 10' },
    top25: { color: '#a855f7', label: 'Top 25' },
  },
} as const;

/**
 * Get position-specific styling
 */
export function getPositionStyle(position: number): {
  isPodium: boolean;
  color?: string;
  label?: string;
  icon?: string;
  isTop5: boolean;
  isTop10: boolean;
  isTop25: boolean;
} {
  const displayPosition = position + 1; // Convert 0-indexed to 1-indexed

  const isPodium = displayPosition <= 3;
  const podiumStyle = isPodium
    ? POSITION_STYLES.podium[displayPosition as 1 | 2 | 3]
    : undefined;

  return {
    isPodium,
    color: podiumStyle?.color,
    label: podiumStyle?.label,
    icon: podiumStyle?.icon,
    isTop5: displayPosition <= 5,
    isTop10: displayPosition <= 10,
    isTop25: displayPosition <= 25,
  };
}
