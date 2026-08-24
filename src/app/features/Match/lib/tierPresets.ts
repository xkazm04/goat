/**
 * Tier List View Presets
 * Category-specific tier configurations for the tier list view
 */

import { TIER_COLORS, TIER_DESCRIPTIONS } from '@/lib/tiers/constants';

import type { TierLabel, ExtendedTierLabel } from '@/lib/tiers/types';
import type {
  TierColor,
  TierDefinition as RankingTierDefinition,
  TierLabel as RankingTierLabel,
  ExtendedTierLabel as RankingExtendedTierLabel,
} from '@/types/ranking';

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

// ============================================================================
// Custom Tier Preset System (consolidated from lib/tier/customPresets.ts)
// ============================================================================

/**
 * Custom tier preset configuration for the preset gallery/editor UI
 */
export interface CustomTierPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  tiers: CustomTierDefinition[];
  showUnranked: boolean;
  isSystem: boolean;
  author?: string;
  createdAt?: number;
}

/**
 * Extended tier definition with custom properties
 */
export interface CustomTierDefinition extends RankingTierDefinition {
  customLabel?: string;
  customColor?: string;
  emoji?: string;
  order: number;
}

/**
 * Predefined color palettes for tier creation
 */
export const TIER_COLOR_PALETTES = {
  classic: ['#FF4444', '#FF8800', '#FFCC00', '#00CC44', '#0088FF', '#8844FF'],
  neon: ['#FF00FF', '#00FFFF', '#FF0099', '#00FF99', '#9900FF', '#FF9900'],
  pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4'],
  ocean: ['#001F54', '#034078', '#1282A2', '#0A9396', '#94D2BD', '#E9D8A6'],
  sunset: ['#FF595E', '#FF924C', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93'],
  forest: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7'],
  fire: ['#7F0000', '#B22222', '#DC143C', '#FF4500', '#FF6347', '#FFA07A'],
  ice: ['#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#42A5F5', '#64B5F6'],
} as const;

/**
 * Create a tier color from a hex value
 */
export function createTierColor(hex: string): TierColor {
  const lighten = (color: string, amount: number) => {
    const num = parseInt(color.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
    const b = Math.min(255, (num & 0x0000ff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  const getLuminance = (h: string) => {
    const rgb = parseInt(h.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };

  const textColor = getLuminance(hex) > 0.5 ? '#000000' : '#FFFFFF';

  return {
    primary: hex,
    secondary: lighten(hex, 40),
    accent: lighten(hex, 80),
    gradient: `linear-gradient(135deg, ${hex}, ${lighten(hex, 30)})`,
    glow: `${hex}80`,
    text: textColor,
    border: hex,
  };
}

function createCustomPresetTier(
  id: string,
  label: RankingTierLabel | RankingExtendedTierLabel,
  displayName: string,
  description: string,
  hex: string,
  order: number,
  customLabel?: string,
  emoji?: string,
): CustomTierDefinition {
  return { id, label, displayName, description, color: createTierColor(hex), order, customLabel, emoji };
}

/**
 * System tier presets for the preset gallery
 */
export const SYSTEM_TIER_PRESETS: CustomTierPreset[] = [
  {
    id: 'classic', name: 'Classic', description: 'Standard S/A/B/C/D/F tier list', category: 'general', showUnranked: true, isSystem: true,
    tiers: [
      createCustomPresetTier('S', 'S', 'S Tier', 'The best of the best', '#FF4444', 0),
      createCustomPresetTier('A', 'A', 'A Tier', 'Excellent choices', '#FF8800', 1),
      createCustomPresetTier('B', 'B', 'B Tier', 'Good picks', '#FFCC00', 2),
      createCustomPresetTier('C', 'C', 'C Tier', 'Average selections', '#00CC44', 3),
      createCustomPresetTier('D', 'D', 'D Tier', 'Below average', '#0088FF', 4),
      createCustomPresetTier('F', 'F', 'F Tier', 'Not recommended', '#8844FF', 5),
    ],
  },
  {
    id: 'god-tier', name: 'God Tier', description: 'God Tier / Elite / Solid / Mid / Trash', category: 'general', showUnranked: true, isSystem: true,
    tiers: [
      createCustomPresetTier('god', 'S', 'God Tier', 'Absolute peak', '#FFD700', 0, 'God Tier', '👑'),
      createCustomPresetTier('elite', 'A', 'Elite', 'Top tier excellence', '#C0C0C0', 1, 'Elite', '⭐'),
      createCustomPresetTier('solid', 'B', 'Solid', 'Consistently good', '#CD7F32', 2, 'Solid', '💪'),
      createCustomPresetTier('mid', 'C', 'Mid', 'Average, nothing special', '#808080', 3, 'Mid', '😐'),
      createCustomPresetTier('trash', 'F', 'Trash', 'Bottom of the barrel', '#8B4513', 4, 'Trash', '🗑️'),
    ],
  },
  {
    id: 'gaming-meta', name: 'Gaming Meta', description: 'Meta / Strong / Viable / Situational / Troll', category: 'gaming', showUnranked: true, isSystem: true,
    tiers: [
      createCustomPresetTier('meta', 'S', 'Meta', 'Must-pick, overpowered', '#FF0000', 0, 'Meta', '🔥'),
      createCustomPresetTier('strong', 'A', 'Strong', 'Very effective picks', '#FF6600', 1, 'Strong', '💥'),
      createCustomPresetTier('viable', 'B', 'Viable', 'Can work with skill', '#FFCC00', 2, 'Viable', '✅'),
      createCustomPresetTier('situational', 'C', 'Situational', 'Niche uses only', '#00AAFF', 3, 'Situational', '🎯'),
      createCustomPresetTier('troll', 'F', 'Troll', 'Meme picks', '#9933FF', 4, 'Troll', '🤡'),
    ],
  },
  {
    id: 'film-critic', name: 'Film Critic', description: 'Masterpiece / Excellent / Good / Watchable / Skip', category: 'entertainment', showUnranked: true, isSystem: true,
    tiers: [
      createCustomPresetTier('masterpiece', 'S', 'Masterpiece', 'Cinematic perfection', '#FFD700', 0, 'Masterpiece', '🏆'),
      createCustomPresetTier('excellent', 'A', 'Excellent', 'Must-watch films', '#FF4500', 1, 'Excellent', '🎬'),
      createCustomPresetTier('good', 'B', 'Good', 'Worth your time', '#32CD32', 2, 'Good', '👍'),
      createCustomPresetTier('watchable', 'C', 'Watchable', 'Background viewing', '#4169E1', 3, 'Watchable', '📺'),
      createCustomPresetTier('skip', 'F', 'Skip', 'Waste of time', '#8B0000', 4, 'Skip', '⏭️'),
    ],
  },
  {
    id: 'sports-goat', name: 'Sports GOAT', description: 'GOAT / Hall of Fame / All-Star / Starter / Role Player', category: 'sports', showUnranked: true, isSystem: true,
    tiers: [
      createCustomPresetTier('goat', 'S', 'GOAT', 'Greatest of All Time', '#FFD700', 0, 'GOAT', '🐐'),
      createCustomPresetTier('hof', 'A', 'Hall of Fame', 'Legendary players', '#C0C0C0', 1, 'HOF', '🏆'),
      createCustomPresetTier('allstar', 'B', 'All-Star', 'Elite performers', '#CD7F32', 2, 'All-Star', '⭐'),
      createCustomPresetTier('starter', 'C', 'Starter', 'Solid starters', '#228B22', 3, 'Starter', '▶️'),
      createCustomPresetTier('role', 'D', 'Role Player', 'Contributing role', '#4169E1', 4, 'Role', '🎭'),
      createCustomPresetTier('bench', 'F', 'Bench', 'Reserve players', '#808080', 5, 'Bench', '🪑'),
    ],
  },
  {
    id: 'anime', name: 'Anime', description: 'Peak Fiction / Must Watch / Worth It / Mid / Drop', category: 'entertainment', showUnranked: true, isSystem: true,
    tiers: [
      createCustomPresetTier('peak', 'S', 'Peak Fiction', 'Anime at its finest', '#FF1493', 0, 'Peak Fiction', '🔥'),
      createCustomPresetTier('mustwatch', 'A', 'Must Watch', 'Essential viewing', '#FF6347', 1, 'Must Watch', '👀'),
      createCustomPresetTier('worthit', 'B', 'Worth It', 'Enjoyable experience', '#FFD700', 2, 'Worth It', '✨'),
      createCustomPresetTier('mid', 'C', 'Mid', 'Average anime', '#808080', 3, 'Mid', '😑'),
      createCustomPresetTier('drop', 'F', 'Drop', 'Not worth finishing', '#4B0082', 4, 'Drop', '💀'),
    ],
  },
  {
    id: 'music-albums', name: 'Music Albums', description: 'Classic / Essential / Great / Good / Forgettable', category: 'music', showUnranked: true, isSystem: true,
    tiers: [
      createCustomPresetTier('classic', 'S', 'Classic', 'Timeless masterpiece', '#FFD700', 0, 'Classic', '💿'),
      createCustomPresetTier('essential', 'A', 'Essential', 'Genre-defining', '#C0C0C0', 1, 'Essential', '🎵'),
      createCustomPresetTier('great', 'B', 'Great', 'Highly recommended', '#CD7F32', 2, 'Great', '🎶'),
      createCustomPresetTier('good', 'C', 'Good', 'Worth a listen', '#228B22', 3, 'Good', '👍'),
      createCustomPresetTier('forgettable', 'F', 'Forgettable', 'Not memorable', '#808080', 4, 'Forgettable', '💤'),
    ],
  },
  {
    id: 'food', name: 'Food', description: "Chef's Kiss / Delicious / Tasty / Edible / Avoid", category: 'food', showUnranked: true, isSystem: true,
    tiers: [
      createCustomPresetTier('chefs-kiss', 'S', "Chef's Kiss", 'Culinary perfection', '#FF4500', 0, "Chef's Kiss", '👨‍🍳'),
      createCustomPresetTier('delicious', 'A', 'Delicious', 'Outstanding flavor', '#FF8C00', 1, 'Delicious', '😋'),
      createCustomPresetTier('tasty', 'B', 'Tasty', 'Enjoyable eating', '#FFD700', 2, 'Tasty', '😊'),
      createCustomPresetTier('edible', 'C', 'Edible', 'Gets the job done', '#9ACD32', 3, 'Edible', '🤷'),
      createCustomPresetTier('avoid', 'F', 'Avoid', 'Not worth eating', '#8B4513', 4, 'Avoid', '🤢'),
    ],
  },
  {
    id: 'simple-3', name: 'Simple (3 Tiers)', description: 'Best / Good / Meh', category: 'general', showUnranked: true, isSystem: true,
    tiers: [
      createCustomPresetTier('best', 'S', 'Best', 'Top picks', '#00FF00', 0, 'Best'),
      createCustomPresetTier('good', 'B', 'Good', 'Solid choices', '#FFFF00', 1, 'Good'),
      createCustomPresetTier('meh', 'D', 'Meh', 'Nothing special', '#FF0000', 2, 'Meh'),
    ],
  },
  {
    id: 'extended-10', name: 'Extended (10 Tiers)', description: 'Detailed S+ through F- ranking', category: 'general', showUnranked: true, isSystem: true,
    tiers: [
      createCustomPresetTier('S+', 'S', 'S+', 'Absolutely perfect', '#FF0000', 0, 'S+'),
      createCustomPresetTier('S', 'S', 'S', 'Near perfect', '#FF4400', 1, 'S'),
      createCustomPresetTier('A+', 'A', 'A+', 'Exceptional', '#FF8800', 2, 'A+'),
      createCustomPresetTier('A', 'A', 'A', 'Excellent', '#FFBB00', 3, 'A'),
      createCustomPresetTier('B+', 'B', 'B+', 'Very good', '#FFEE00', 4, 'B+'),
      createCustomPresetTier('B', 'B', 'B', 'Good', '#CCFF00', 5, 'B'),
      createCustomPresetTier('C+', 'C', 'C+', 'Above average', '#88FF00', 6, 'C+'),
      createCustomPresetTier('C', 'C', 'C', 'Average', '#00FF44', 7, 'C'),
      createCustomPresetTier('D', 'D', 'D', 'Below average', '#00AAFF', 8, 'D'),
      createCustomPresetTier('F', 'F', 'F', 'Poor', '#8844FF', 9, 'F'),
    ],
  },
];

/**
 * Get custom presets by category
 */
export function getCustomPresetsByCategory(category: string): CustomTierPreset[] {
  if (category === 'all') return SYSTEM_TIER_PRESETS;
  return SYSTEM_TIER_PRESETS.filter(p => p.category === category || p.category === 'general');
}

/**
 * Get all unique custom preset categories
 */
export function getCustomPresetCategories(): string[] {
  const categories = new Set(SYSTEM_TIER_PRESETS.map(p => p.category));
  return ['all', ...Array.from(categories)];
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
