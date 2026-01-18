/**
 * Tier Classification Constants
 * Predefined tier configurations, colors, and presets
 */

import { TierDefinition, TierPreset, ExtendedTierLabel } from './types';

/**
 * Standard tier colors with rich gradients
 */
export const TIER_COLORS: Record<ExtendedTierLabel, TierDefinition['color']> = {
  'S+': {
    primary: '#FFD700',
    secondary: '#FFA500',
    accent: '#FFEC8B',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
    glow: '0 0 20px rgba(255, 215, 0, 0.6)',
    text: '#1a1a1a',
    border: '#FFD700',
  },
  'S': {
    primary: '#FF4500',
    secondary: '#DC143C',
    accent: '#FF6347',
    gradient: 'linear-gradient(135deg, #FF4500 0%, #DC143C 100%)',
    glow: '0 0 20px rgba(255, 69, 0, 0.5)',
    text: '#ffffff',
    border: '#FF4500',
  },
  'A+': {
    primary: '#FF6B35',
    secondary: '#E55039',
    accent: '#FF8C42',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #E55039 100%)',
    glow: '0 0 15px rgba(255, 107, 53, 0.4)',
    text: '#ffffff',
    border: '#FF6B35',
  },
  'A': {
    primary: '#FF8C00',
    secondary: '#FF7F50',
    accent: '#FFA54F',
    gradient: 'linear-gradient(135deg, #FF8C00 0%, #FF7F50 100%)',
    glow: '0 0 15px rgba(255, 140, 0, 0.4)',
    text: '#ffffff',
    border: '#FF8C00',
  },
  'A-': {
    primary: '#FFA94D',
    secondary: '#FF9F43',
    accent: '#FFB366',
    gradient: 'linear-gradient(135deg, #FFA94D 0%, #FF9F43 100%)',
    glow: '0 0 12px rgba(255, 169, 77, 0.35)',
    text: '#1a1a1a',
    border: '#FFA94D',
  },
  'B+': {
    primary: '#FFD93D',
    secondary: '#F9CA24',
    accent: '#FFE066',
    gradient: 'linear-gradient(135deg, #FFD93D 0%, #F9CA24 100%)',
    glow: '0 0 12px rgba(255, 217, 61, 0.35)',
    text: '#1a1a1a',
    border: '#FFD93D',
  },
  'B': {
    primary: '#FFEB3B',
    secondary: '#FDD835',
    accent: '#FFF176',
    gradient: 'linear-gradient(135deg, #FFEB3B 0%, #FDD835 100%)',
    glow: '0 0 12px rgba(255, 235, 59, 0.35)',
    text: '#1a1a1a',
    border: '#FFEB3B',
  },
  'B-': {
    primary: '#C8E6C9',
    secondary: '#A5D6A7',
    accent: '#81C784',
    gradient: 'linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%)',
    glow: '0 0 10px rgba(200, 230, 201, 0.3)',
    text: '#1a1a1a',
    border: '#81C784',
  },
  'C+': {
    primary: '#4CAF50',
    secondary: '#43A047',
    accent: '#66BB6A',
    gradient: 'linear-gradient(135deg, #4CAF50 0%, #43A047 100%)',
    glow: '0 0 10px rgba(76, 175, 80, 0.3)',
    text: '#ffffff',
    border: '#4CAF50',
  },
  'C': {
    primary: '#2196F3',
    secondary: '#1E88E5',
    accent: '#42A5F5',
    gradient: 'linear-gradient(135deg, #2196F3 0%, #1E88E5 100%)',
    glow: '0 0 10px rgba(33, 150, 243, 0.3)',
    text: '#ffffff',
    border: '#2196F3',
  },
  'C-': {
    primary: '#64B5F6',
    secondary: '#42A5F5',
    accent: '#90CAF9',
    gradient: 'linear-gradient(135deg, #64B5F6 0%, #42A5F5 100%)',
    glow: '0 0 8px rgba(100, 181, 246, 0.25)',
    text: '#1a1a1a',
    border: '#64B5F6',
  },
  'D+': {
    primary: '#9575CD',
    secondary: '#7E57C2',
    accent: '#B39DDB',
    gradient: 'linear-gradient(135deg, #9575CD 0%, #7E57C2 100%)',
    glow: '0 0 8px rgba(149, 117, 205, 0.25)',
    text: '#ffffff',
    border: '#9575CD',
  },
  'D': {
    primary: '#7986CB',
    secondary: '#5C6BC0',
    accent: '#9FA8DA',
    gradient: 'linear-gradient(135deg, #7986CB 0%, #5C6BC0 100%)',
    glow: '0 0 8px rgba(121, 134, 203, 0.25)',
    text: '#ffffff',
    border: '#7986CB',
  },
  'D-': {
    primary: '#90A4AE',
    secondary: '#78909C',
    accent: '#B0BEC5',
    gradient: 'linear-gradient(135deg, #90A4AE 0%, #78909C 100%)',
    glow: '0 0 6px rgba(144, 164, 174, 0.2)',
    text: '#1a1a1a',
    border: '#90A4AE',
  },
  'F': {
    primary: '#607D8B',
    secondary: '#546E7A',
    accent: '#78909C',
    gradient: 'linear-gradient(135deg, #607D8B 0%, #546E7A 100%)',
    glow: '0 0 6px rgba(96, 125, 139, 0.2)',
    text: '#ffffff',
    border: '#607D8B',
  },
};

/**
 * Tier descriptions for tooltips
 */
export const TIER_DESCRIPTIONS: Record<ExtendedTierLabel, string> = {
  'S+': 'Elite of the elite - absolute pinnacle',
  'S': 'Legendary tier - best of the best',
  'A+': 'Exceptional - nearly perfect',
  'A': 'Excellent tier - top quality',
  'A-': 'Very good - above average excellence',
  'B+': 'Good with standout qualities',
  'B': 'Solid tier - good quality',
  'B-': 'Decent - above average',
  'C+': 'Average with some merit',
  'C': 'Average tier - middle ground',
  'C-': 'Below average - some issues',
  'D+': 'Poor but has some value',
  'D': 'Poor tier - significant issues',
  'D-': 'Very poor - barely acceptable',
  'F': 'Lowest tier - needs improvement',
};

/**
 * Create a tier definition
 */
function createTier(
  label: ExtendedTierLabel,
  startPosition: number,
  endPosition: number,
  displayName?: string
): TierDefinition {
  return {
    id: `tier-${label.toLowerCase().replace('+', '-plus').replace('-', '-minus')}`,
    label,
    displayName: displayName || `${label} Tier`,
    description: TIER_DESCRIPTIONS[label],
    startPosition,
    endPosition,
    color: TIER_COLORS[label],
  };
}

/**
 * Standard 4-tier preset (S, A, B, C)
 */
export const PRESET_4_TIER: TierPreset = {
  id: 'preset-4-tier',
  name: 'Classic 4-Tier',
  description: 'Traditional S/A/B/C tier system',
  tierCount: 4,
  listSizeRange: { min: 5, max: 20 },
  isDefault: true,
  tiers: [
    createTier('S', 0, 2, 'S Tier'),
    createTier('A', 2, 5, 'A Tier'),
    createTier('B', 5, 10, 'B Tier'),
    createTier('C', 10, 20, 'C Tier'),
  ],
};

/**
 * Standard 5-tier preset (S, A, B, C, D)
 */
export const PRESET_5_TIER: TierPreset = {
  id: 'preset-5-tier',
  name: 'Standard 5-Tier',
  description: 'Standard tier list with 5 levels',
  tierCount: 5,
  listSizeRange: { min: 10, max: 30 },
  tiers: [
    createTier('S', 0, 3, 'S Tier'),
    createTier('A', 3, 7, 'A Tier'),
    createTier('B', 7, 14, 'B Tier'),
    createTier('C', 14, 22, 'C Tier'),
    createTier('D', 22, 30, 'D Tier'),
  ],
};

/**
 * Extended 6-tier preset (S, A, B, C, D, F)
 */
export const PRESET_6_TIER: TierPreset = {
  id: 'preset-6-tier',
  name: 'Full 6-Tier',
  description: 'Complete tier system with F tier',
  tierCount: 6,
  listSizeRange: { min: 15, max: 50 },
  tiers: [
    createTier('S', 0, 3, 'S Tier'),
    createTier('A', 3, 8, 'A Tier'),
    createTier('B', 8, 18, 'B Tier'),
    createTier('C', 18, 30, 'C Tier'),
    createTier('D', 30, 42, 'D Tier'),
    createTier('F', 42, 50, 'F Tier'),
  ],
};

/**
 * Detailed 9-tier preset with plus/minus variants
 */
export const PRESET_9_TIER: TierPreset = {
  id: 'preset-9-tier',
  name: 'Detailed 9-Tier',
  description: 'Granular system with +/- modifiers',
  tierCount: 9,
  listSizeRange: { min: 25, max: 100 },
  tiers: [
    createTier('S', 0, 3),
    createTier('A+', 3, 7),
    createTier('A', 7, 12),
    createTier('A-', 12, 18),
    createTier('B+', 18, 28),
    createTier('B', 28, 42),
    createTier('B-', 42, 58),
    createTier('C', 58, 78),
    createTier('D', 78, 100),
  ],
};

/**
 * Pyramid preset (fewer items in top tiers)
 */
export const PRESET_PYRAMID: TierPreset = {
  id: 'preset-pyramid',
  name: 'Pyramid',
  description: 'Exponentially larger lower tiers',
  tierCount: 5,
  listSizeRange: { min: 15, max: 100 },
  tiers: [
    createTier('S', 0, 1, 'Elite'),       // 1 item
    createTier('A', 1, 4, 'Excellent'),   // 3 items
    createTier('B', 4, 12, 'Good'),       // 8 items
    createTier('C', 12, 30, 'Average'),   // 18 items
    createTier('D', 30, 100, 'Below'),    // 70 items
  ],
};

/**
 * Top 10 optimized preset
 */
export const PRESET_TOP_10: TierPreset = {
  id: 'preset-top-10',
  name: 'Top 10',
  description: 'Optimized for Top 10 lists',
  tierCount: 3,
  listSizeRange: { min: 10, max: 10 },
  tiers: [
    createTier('S', 0, 3, 'GOAT'),
    createTier('A', 3, 6, 'Elite'),
    createTier('B', 6, 10, 'Great'),
  ],
};

/**
 * Top 25 optimized preset
 */
export const PRESET_TOP_25: TierPreset = {
  id: 'preset-top-25',
  name: 'Top 25',
  description: 'Optimized for Top 25 lists',
  tierCount: 4,
  listSizeRange: { min: 25, max: 25 },
  tiers: [
    createTier('S', 0, 3, 'GOAT'),
    createTier('A', 3, 8, 'Elite'),
    createTier('B', 8, 15, 'Great'),
    createTier('C', 15, 25, 'Good'),
  ],
};

/**
 * Top 50 optimized preset
 */
export const PRESET_TOP_50: TierPreset = {
  id: 'preset-top-50',
  name: 'Top 50',
  description: 'Optimized for Top 50 lists',
  tierCount: 5,
  listSizeRange: { min: 50, max: 50 },
  tiers: [
    createTier('S', 0, 5, 'GOAT'),
    createTier('A', 5, 12, 'Elite'),
    createTier('B', 12, 25, 'Great'),
    createTier('C', 25, 38, 'Good'),
    createTier('D', 38, 50, 'Notable'),
  ],
};

/**
 * All available presets
 */
export const TIER_PRESETS: TierPreset[] = [
  PRESET_4_TIER,
  PRESET_5_TIER,
  PRESET_6_TIER,
  PRESET_9_TIER,
  PRESET_PYRAMID,
  PRESET_TOP_10,
  PRESET_TOP_25,
  PRESET_TOP_50,
];

/**
 * Get the best preset for a given list size
 */
export function getBestPresetForSize(listSize: number): TierPreset {
  // Check for exact match first
  const exactMatch = TIER_PRESETS.find(
    p => p.listSizeRange.min === listSize && p.listSizeRange.max === listSize
  );
  if (exactMatch) return exactMatch;

  // Find presets that fit the size range
  const fitting = TIER_PRESETS.filter(
    p => listSize >= p.listSizeRange.min && listSize <= p.listSizeRange.max
  );

  if (fitting.length > 0) {
    // Prefer default, then most tiers
    return fitting.find(p => p.isDefault) || fitting.sort((a, b) => b.tierCount - a.tierCount)[0];
  }

  // Fallback based on size
  if (listSize <= 10) return PRESET_TOP_10;
  if (listSize <= 25) return PRESET_TOP_25;
  if (listSize <= 50) return PRESET_TOP_50;
  return PRESET_9_TIER;
}

/**
 * Animation presets for tier transitions
 */
export const TIER_ANIMATIONS = {
  bandEnter: {
    initial: { opacity: 0, scaleY: 0 },
    animate: { opacity: 1, scaleY: 1 },
    transition: { type: 'spring' as const, damping: 20, stiffness: 300 },
  },
  separatorEnter: {
    initial: { opacity: 0, width: 0 },
    animate: { opacity: 1, width: '100%' },
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  labelEnter: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: 0.1, duration: 0.2 },
  },
};

/**
 * Default tier configuration
 */
export const DEFAULT_TIER_CONFIGURATION = {
  enabled: false,
  preset: PRESET_5_TIER,
  customThresholds: [],
  showBands: true,
  showLabels: true,
  showSeparators: true,
  autoAdjust: true,
};
