/**
 * Tier List View Presets
 * Category-specific tier configurations for the tier list view
 */

import { TierLabel, ExtendedTierLabel } from '@/lib/tiers/types';
import { TIER_COLORS, TIER_DESCRIPTIONS } from '@/lib/tiers/constants';

/**
 * Tier configuration for the tier list view
 */
export interface TierListTier {
  id: string;
  label: TierLabel | ExtendedTierLabel;
  displayName: string;
  description: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
    glow: string;
    text: string;
    border: string;
  };
  /** Items in this tier */
  items: string[]; // Item IDs
  /** Whether this tier is collapsed */
  collapsed: boolean;
  /** Custom label override */
  customLabel?: string;
  /** Custom color override */
  customColor?: string;
}

/**
 * Tier list preset configuration
 */
export interface TierListPreset {
  id: string;
  name: string;
  description: string;
  category: string; // gaming, sports, movies, music, anime, etc.
  tiers: TierListTier[];
  /** Whether unranked pool is shown */
  showUnranked: boolean;
  /** Social media optimized dimensions */
  exportDimensions: {
    width: number;
    height: number;
  };
}

/**
 * Create a tier for tier list view
 */
function createTierListTier(
  label: TierLabel | ExtendedTierLabel,
  customLabel?: string
): TierListTier {
  return {
    id: `tier-${label.toLowerCase().replace('+', '-plus').replace('-', '-minus')}`,
    label,
    displayName: customLabel || `${label} Tier`,
    description: TIER_DESCRIPTIONS[label] || '',
    color: TIER_COLORS[label],
    items: [],
    collapsed: false,
    customLabel,
  };
}

/**
 * Classic S-F tier preset (most popular)
 */
export const PRESET_CLASSIC: TierListPreset = {
  id: 'classic',
  name: 'Classic',
  description: 'Standard S/A/B/C/D/F tier list',
  category: 'general',
  showUnranked: true,
  exportDimensions: { width: 1200, height: 675 },
  tiers: [
    createTierListTier('S'),
    createTierListTier('A'),
    createTierListTier('B'),
    createTierListTier('C'),
    createTierListTier('D'),
    createTierListTier('F'),
  ],
};

/**
 * Gaming tier preset
 */
export const PRESET_GAMING: TierListPreset = {
  id: 'gaming',
  name: 'Gaming',
  description: 'Tier list optimized for game rankings',
  category: 'gaming',
  showUnranked: true,
  exportDimensions: { width: 1200, height: 800 },
  tiers: [
    createTierListTier('S', 'Meta'),
    createTierListTier('A', 'Strong'),
    createTierListTier('B', 'Viable'),
    createTierListTier('C', 'Situational'),
    createTierListTier('D', 'Weak'),
    createTierListTier('F', 'Meme Tier'),
  ],
};

/**
 * Sports tier preset
 */
export const PRESET_SPORTS: TierListPreset = {
  id: 'sports',
  name: 'Sports',
  description: 'Tier list for sports rankings',
  category: 'sports',
  showUnranked: true,
  exportDimensions: { width: 1200, height: 675 },
  tiers: [
    createTierListTier('S', 'GOAT'),
    createTierListTier('A', 'Hall of Fame'),
    createTierListTier('B', 'All-Star'),
    createTierListTier('C', 'Starter'),
    createTierListTier('D', 'Role Player'),
    createTierListTier('F', 'Bench'),
  ],
};

/**
 * Movies/TV tier preset
 */
export const PRESET_ENTERTAINMENT: TierListPreset = {
  id: 'entertainment',
  name: 'Movies & TV',
  description: 'Tier list for movies and TV shows',
  category: 'entertainment',
  showUnranked: true,
  exportDimensions: { width: 1200, height: 675 },
  tiers: [
    createTierListTier('S', 'Masterpiece'),
    createTierListTier('A', 'Excellent'),
    createTierListTier('B', 'Good'),
    createTierListTier('C', 'Average'),
    createTierListTier('D', 'Below Average'),
    createTierListTier('F', 'Skip'),
  ],
};

/**
 * Music tier preset
 */
export const PRESET_MUSIC: TierListPreset = {
  id: 'music',
  name: 'Music',
  description: 'Tier list for music rankings',
  category: 'music',
  showUnranked: true,
  exportDimensions: { width: 1200, height: 675 },
  tiers: [
    createTierListTier('S', 'Classic'),
    createTierListTier('A', 'Essential'),
    createTierListTier('B', 'Great'),
    createTierListTier('C', 'Good'),
    createTierListTier('D', 'Mid'),
    createTierListTier('F', 'Skip'),
  ],
};

/**
 * Anime tier preset
 */
export const PRESET_ANIME: TierListPreset = {
  id: 'anime',
  name: 'Anime',
  description: 'Tier list for anime rankings',
  category: 'anime',
  showUnranked: true,
  exportDimensions: { width: 1200, height: 800 },
  tiers: [
    createTierListTier('S', 'Peak Fiction'),
    createTierListTier('A', 'Must Watch'),
    createTierListTier('B', 'Enjoyable'),
    createTierListTier('C', 'Average'),
    createTierListTier('D', 'Mid'),
    createTierListTier('F', 'Drop'),
  ],
};

/**
 * Food tier preset
 */
export const PRESET_FOOD: TierListPreset = {
  id: 'food',
  name: 'Food',
  description: 'Tier list for food rankings',
  category: 'food',
  showUnranked: true,
  exportDimensions: { width: 1200, height: 675 },
  tiers: [
    createTierListTier('S', 'Chef\'s Kiss'),
    createTierListTier('A', 'Delicious'),
    createTierListTier('B', 'Tasty'),
    createTierListTier('C', 'Okay'),
    createTierListTier('D', 'Meh'),
    createTierListTier('F', 'Gross'),
  ],
};

/**
 * Simple 4-tier preset
 */
export const PRESET_SIMPLE: TierListPreset = {
  id: 'simple',
  name: 'Simple',
  description: 'Simplified 4-tier system',
  category: 'general',
  showUnranked: true,
  exportDimensions: { width: 1200, height: 500 },
  tiers: [
    createTierListTier('S', 'Best'),
    createTierListTier('A', 'Great'),
    createTierListTier('B', 'Good'),
    createTierListTier('C', 'Meh'),
  ],
};

/**
 * Extended tier preset with +/- modifiers
 */
export const PRESET_EXTENDED: TierListPreset = {
  id: 'extended',
  name: 'Extended',
  description: 'Detailed tiers with +/- modifiers',
  category: 'general',
  showUnranked: true,
  exportDimensions: { width: 1200, height: 1000 },
  tiers: [
    createTierListTier('S'),
    createTierListTier('A+'),
    createTierListTier('A'),
    createTierListTier('A-'),
    createTierListTier('B+'),
    createTierListTier('B'),
    createTierListTier('B-'),
    createTierListTier('C'),
    createTierListTier('D'),
    createTierListTier('F'),
  ],
};

/**
 * All available tier list presets
 */
export const TIER_LIST_PRESETS: TierListPreset[] = [
  PRESET_CLASSIC,
  PRESET_GAMING,
  PRESET_SPORTS,
  PRESET_ENTERTAINMENT,
  PRESET_MUSIC,
  PRESET_ANIME,
  PRESET_FOOD,
  PRESET_SIMPLE,
  PRESET_EXTENDED,
];

/**
 * Get preset by ID
 */
export function getPresetById(id: string): TierListPreset | undefined {
  return TIER_LIST_PRESETS.find(p => p.id === id);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: string): TierListPreset[] {
  if (category === 'all') return TIER_LIST_PRESETS;
  return TIER_LIST_PRESETS.filter(p => p.category === category || p.category === 'general');
}

/**
 * Create a custom tier
 */
export function createCustomTier(
  label: string,
  color: string,
  position: number
): TierListTier {
  // Find closest standard color or use custom
  const standardColor = Object.entries(TIER_COLORS).find(([, c]) => c.primary === color)?.[0] as ExtendedTierLabel | undefined;

  return {
    id: `tier-custom-${position}`,
    label: (standardColor || 'S') as TierLabel,
    displayName: label,
    description: `Custom tier: ${label}`,
    color: standardColor
      ? TIER_COLORS[standardColor]
      : {
          primary: color,
          secondary: color,
          accent: color,
          gradient: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          glow: `0 0 15px ${color}80`,
          text: '#ffffff',
          border: color,
        },
    items: [],
    collapsed: false,
    customLabel: label,
    customColor: color,
  };
}

/**
 * Convert tier list to linear ranking positions
 * Items higher in list and earlier in tier get lower (better) positions
 */
export function tierListToRanking(tiers: TierListTier[]): Map<string, number> {
  const ranking = new Map<string, number>();
  let position = 0;

  for (const tier of tiers) {
    for (const itemId of tier.items) {
      ranking.set(itemId, position);
      position++;
    }
  }

  return ranking;
}

/**
 * Convert linear ranking to tier list placement
 * Distributes items across tiers based on position percentiles
 */
export function rankingToTierList(
  itemIds: string[],
  preset: TierListPreset
): TierListTier[] {
  const totalItems = itemIds.length;
  const tierCount = preset.tiers.length;

  // Clone tiers and clear items
  const tiers: TierListTier[] = preset.tiers.map(t => ({
    ...t,
    items: [],
  }));

  if (totalItems === 0) return tiers;

  // Pyramid distribution - fewer items in top tiers
  // S: ~5%, A: ~10%, B: ~20%, C: ~30%, D: ~25%, F: ~10%
  const distribution = [0.05, 0.10, 0.20, 0.30, 0.25, 0.10];

  let currentIndex = 0;
  for (let tierIndex = 0; tierIndex < tierCount; tierIndex++) {
    // Calculate items for this tier
    const tierPercentage = distribution[tierIndex] || (1 / tierCount);
    const tierItemCount = Math.max(1, Math.round(totalItems * tierPercentage));
    const endIndex = Math.min(currentIndex + tierItemCount, totalItems);

    // Assign items to tier
    for (let i = currentIndex; i < endIndex; i++) {
      if (itemIds[i]) {
        tiers[tierIndex].items.push(itemIds[i]);
      }
    }

    currentIndex = endIndex;
    if (currentIndex >= totalItems) break;
  }

  // Any remaining items go to last tier
  if (currentIndex < totalItems) {
    for (let i = currentIndex; i < totalItems; i++) {
      if (itemIds[i]) {
        tiers[tierCount - 1].items.push(itemIds[i]);
      }
    }
  }

  return tiers;
}

/**
 * Community tier consensus data structure
 */
export interface CommunityTierConsensus {
  itemId: string;
  consensusTier: TierLabel | ExtendedTierLabel;
  confidence: number; // 0-1
  totalVotes: number;
  distribution: Record<string, number>; // tier -> vote count
}

/**
 * Calculate tier agreement score between user and community
 */
export function calculateTierAgreement(
  userTiers: TierListTier[],
  communityConsensus: CommunityTierConsensus[]
): {
  agreementScore: number;
  agreements: string[];
  disagreements: Array<{ itemId: string; userTier: string; communityTier: string; diff: number }>;
} {
  const consensusMap = new Map(communityConsensus.map(c => [c.itemId, c]));
  const tierOrder: (TierLabel | ExtendedTierLabel)[] = ['S', 'A', 'B', 'C', 'D', 'F'];

  let totalItems = 0;
  let matches = 0;
  const agreements: string[] = [];
  const disagreements: Array<{ itemId: string; userTier: string; communityTier: string; diff: number }> = [];

  for (const tier of userTiers) {
    for (const itemId of tier.items) {
      const consensus = consensusMap.get(itemId);
      if (!consensus) continue;

      totalItems++;
      const userTierIndex = tierOrder.indexOf(tier.label as TierLabel);
      const communityTierIndex = tierOrder.indexOf(consensus.consensusTier as TierLabel);

      const diff = Math.abs(userTierIndex - communityTierIndex);

      if (diff === 0) {
        matches++;
        agreements.push(itemId);
      } else {
        disagreements.push({
          itemId,
          userTier: tier.label,
          communityTier: consensus.consensusTier,
          diff,
        });
      }
    }
  }

  return {
    agreementScore: totalItems > 0 ? (matches / totalItems) * 100 : 0,
    agreements,
    disagreements: disagreements.sort((a, b) => b.diff - a.diff),
  };
}
