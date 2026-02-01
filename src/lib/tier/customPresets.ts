/**
 * Custom Tier Presets
 *
 * Domain-specific and user-customizable tier configurations.
 * Enables unique ranking taxonomies beyond the standard S/A/B/C/D/F structure.
 */

import type { TierDefinition, TierColor } from '@/types/ranking';

// ============================================================================
// Types
// ============================================================================

/**
 * Custom tier preset configuration
 */
export interface CustomTierPreset {
  /** Unique preset ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Category (general, gaming, sports, entertainment, etc.) */
  category: string;
  /** Tier definitions with custom labels and colors */
  tiers: CustomTierDefinition[];
  /** Whether to show unranked pool */
  showUnranked: boolean;
  /** Whether this is a system preset (non-editable) */
  isSystem: boolean;
  /** Author name for user-created presets */
  author?: string;
  /** Creation timestamp */
  createdAt?: number;
}

/**
 * Extended tier definition with custom properties
 */
export interface CustomTierDefinition extends TierDefinition {
  /** Custom label override (e.g., "God Tier" instead of "S") */
  customLabel?: string;
  /** Custom color override as hex string */
  customColor?: string;
  /** Emoji for the tier (optional) */
  emoji?: string;
  /** Position order (for drag-and-drop reordering) */
  order: number;
}

/**
 * User tier configuration stored in session/local storage
 */
export interface UserTierConfig {
  /** Active preset ID */
  presetId: string;
  /** Custom modifications to the preset */
  customizations: TierCustomization[];
  /** Collapsed tier IDs */
  collapsedTierIds: string[];
  /** Last modified timestamp */
  lastModified: number;
}

/**
 * Single tier customization
 */
export interface TierCustomization {
  tierId: string;
  customLabel?: string;
  customColor?: string;
  hidden?: boolean;
}

// ============================================================================
// Color Palettes
// ============================================================================

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
  // Lighten for secondary, more for accent
  const lighten = (color: string, amount: number) => {
    const num = parseInt(color.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
    const b = Math.min(255, (num & 0x0000ff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Determine text color based on luminance
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
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

// ============================================================================
// System Presets
// ============================================================================

/**
 * Classic S-F tier preset (default)
 */
export const PRESET_CLASSIC: CustomTierPreset = {
  id: 'classic',
  name: 'Classic',
  description: 'Standard S/A/B/C/D/F tier list',
  category: 'general',
  showUnranked: true,
  isSystem: true,
  tiers: [
    { id: 'S', label: 'S', displayName: 'S Tier', description: 'The best of the best', color: createTierColor('#FF4444'), order: 0 },
    { id: 'A', label: 'A', displayName: 'A Tier', description: 'Excellent choices', color: createTierColor('#FF8800'), order: 1 },
    { id: 'B', label: 'B', displayName: 'B Tier', description: 'Good picks', color: createTierColor('#FFCC00'), order: 2 },
    { id: 'C', label: 'C', displayName: 'C Tier', description: 'Average selections', color: createTierColor('#00CC44'), order: 3 },
    { id: 'D', label: 'D', displayName: 'D Tier', description: 'Below average', color: createTierColor('#0088FF'), order: 4 },
    { id: 'F', label: 'F', displayName: 'F Tier', description: 'Not recommended', color: createTierColor('#8844FF'), order: 5 },
  ],
};

/**
 * God Tier preset - popular alternative naming
 */
export const PRESET_GOD_TIER: CustomTierPreset = {
  id: 'god-tier',
  name: 'God Tier',
  description: 'God Tier / Elite / Solid / Mid / Trash',
  category: 'general',
  showUnranked: true,
  isSystem: true,
  tiers: [
    { id: 'god', label: 'S', displayName: 'God Tier', description: 'Absolute peak', color: createTierColor('#FFD700'), customLabel: 'God Tier', order: 0, emoji: '👑' },
    { id: 'elite', label: 'A', displayName: 'Elite', description: 'Top tier excellence', color: createTierColor('#C0C0C0'), customLabel: 'Elite', order: 1, emoji: '⭐' },
    { id: 'solid', label: 'B', displayName: 'Solid', description: 'Consistently good', color: createTierColor('#CD7F32'), customLabel: 'Solid', order: 2, emoji: '💪' },
    { id: 'mid', label: 'C', displayName: 'Mid', description: 'Average, nothing special', color: createTierColor('#808080'), customLabel: 'Mid', order: 3, emoji: '😐' },
    { id: 'trash', label: 'F', displayName: 'Trash', description: 'Bottom of the barrel', color: createTierColor('#8B4513'), customLabel: 'Trash', order: 4, emoji: '🗑️' },
  ],
};

/**
 * Gaming Meta preset
 */
export const PRESET_GAMING_META: CustomTierPreset = {
  id: 'gaming-meta',
  name: 'Gaming Meta',
  description: 'Meta / Strong / Viable / Situational / Troll',
  category: 'gaming',
  showUnranked: true,
  isSystem: true,
  tiers: [
    { id: 'meta', label: 'S', displayName: 'Meta', description: 'Must-pick, overpowered', color: createTierColor('#FF0000'), customLabel: 'Meta', order: 0, emoji: '🔥' },
    { id: 'strong', label: 'A', displayName: 'Strong', description: 'Very effective picks', color: createTierColor('#FF6600'), customLabel: 'Strong', order: 1, emoji: '💥' },
    { id: 'viable', label: 'B', displayName: 'Viable', description: 'Can work with skill', color: createTierColor('#FFCC00'), customLabel: 'Viable', order: 2, emoji: '✅' },
    { id: 'situational', label: 'C', displayName: 'Situational', description: 'Niche uses only', color: createTierColor('#00AAFF'), customLabel: 'Situational', order: 3, emoji: '🎯' },
    { id: 'troll', label: 'F', displayName: 'Troll', description: 'Meme picks', color: createTierColor('#9933FF'), customLabel: 'Troll', order: 4, emoji: '🤡' },
  ],
};

/**
 * Film Critic preset
 */
export const PRESET_FILM_CRITIC: CustomTierPreset = {
  id: 'film-critic',
  name: 'Film Critic',
  description: 'Masterpiece / Excellent / Good / Watchable / Skip',
  category: 'entertainment',
  showUnranked: true,
  isSystem: true,
  tiers: [
    { id: 'masterpiece', label: 'S', displayName: 'Masterpiece', description: 'Cinematic perfection', color: createTierColor('#FFD700'), customLabel: 'Masterpiece', order: 0, emoji: '🏆' },
    { id: 'excellent', label: 'A', displayName: 'Excellent', description: 'Must-watch films', color: createTierColor('#FF4500'), customLabel: 'Excellent', order: 1, emoji: '🎬' },
    { id: 'good', label: 'B', displayName: 'Good', description: 'Worth your time', color: createTierColor('#32CD32'), customLabel: 'Good', order: 2, emoji: '👍' },
    { id: 'watchable', label: 'C', displayName: 'Watchable', description: 'Background viewing', color: createTierColor('#4169E1'), customLabel: 'Watchable', order: 3, emoji: '📺' },
    { id: 'skip', label: 'F', displayName: 'Skip', description: 'Waste of time', color: createTierColor('#8B0000'), customLabel: 'Skip', order: 4, emoji: '⏭️' },
  ],
};

/**
 * Sports GOAT preset
 */
export const PRESET_SPORTS_GOAT: CustomTierPreset = {
  id: 'sports-goat',
  name: 'Sports GOAT',
  description: 'GOAT / Hall of Fame / All-Star / Starter / Role Player',
  category: 'sports',
  showUnranked: true,
  isSystem: true,
  tiers: [
    { id: 'goat', label: 'S', displayName: 'GOAT', description: 'Greatest of All Time', color: createTierColor('#FFD700'), customLabel: 'GOAT', order: 0, emoji: '🐐' },
    { id: 'hof', label: 'A', displayName: 'Hall of Fame', description: 'Legendary players', color: createTierColor('#C0C0C0'), customLabel: 'HOF', order: 1, emoji: '🏆' },
    { id: 'allstar', label: 'B', displayName: 'All-Star', description: 'Elite performers', color: createTierColor('#CD7F32'), customLabel: 'All-Star', order: 2, emoji: '⭐' },
    { id: 'starter', label: 'C', displayName: 'Starter', description: 'Solid starters', color: createTierColor('#228B22'), customLabel: 'Starter', order: 3, emoji: '▶️' },
    { id: 'role', label: 'D', displayName: 'Role Player', description: 'Contributing role', color: createTierColor('#4169E1'), customLabel: 'Role', order: 4, emoji: '🎭' },
    { id: 'bench', label: 'F', displayName: 'Bench', description: 'Reserve players', color: createTierColor('#808080'), customLabel: 'Bench', order: 5, emoji: '🪑' },
  ],
};

/**
 * Anime preset
 */
export const PRESET_ANIME: CustomTierPreset = {
  id: 'anime',
  name: 'Anime',
  description: 'Peak Fiction / Must Watch / Worth It / Mid / Drop',
  category: 'entertainment',
  showUnranked: true,
  isSystem: true,
  tiers: [
    { id: 'peak', label: 'S', displayName: 'Peak Fiction', description: 'Anime at its finest', color: createTierColor('#FF1493'), customLabel: 'Peak Fiction', order: 0, emoji: '🔥' },
    { id: 'mustwatch', label: 'A', displayName: 'Must Watch', description: 'Essential viewing', color: createTierColor('#FF6347'), customLabel: 'Must Watch', order: 1, emoji: '👀' },
    { id: 'worthit', label: 'B', displayName: 'Worth It', description: 'Enjoyable experience', color: createTierColor('#FFD700'), customLabel: 'Worth It', order: 2, emoji: '✨' },
    { id: 'mid', label: 'C', displayName: 'Mid', description: 'Average anime', color: createTierColor('#808080'), customLabel: 'Mid', order: 3, emoji: '😑' },
    { id: 'drop', label: 'F', displayName: 'Drop', description: 'Not worth finishing', color: createTierColor('#4B0082'), customLabel: 'Drop', order: 4, emoji: '💀' },
  ],
};

/**
 * Music Albums preset
 */
export const PRESET_MUSIC_ALBUMS: CustomTierPreset = {
  id: 'music-albums',
  name: 'Music Albums',
  description: 'Classic / Essential / Great / Good / Forgettable',
  category: 'music',
  showUnranked: true,
  isSystem: true,
  tiers: [
    { id: 'classic', label: 'S', displayName: 'Classic', description: 'Timeless masterpiece', color: createTierColor('#FFD700'), customLabel: 'Classic', order: 0, emoji: '💿' },
    { id: 'essential', label: 'A', displayName: 'Essential', description: 'Genre-defining', color: createTierColor('#C0C0C0'), customLabel: 'Essential', order: 1, emoji: '🎵' },
    { id: 'great', label: 'B', displayName: 'Great', description: 'Highly recommended', color: createTierColor('#CD7F32'), customLabel: 'Great', order: 2, emoji: '🎶' },
    { id: 'good', label: 'C', displayName: 'Good', description: 'Worth a listen', color: createTierColor('#228B22'), customLabel: 'Good', order: 3, emoji: '👍' },
    { id: 'forgettable', label: 'F', displayName: 'Forgettable', description: 'Not memorable', color: createTierColor('#808080'), customLabel: 'Forgettable', order: 4, emoji: '💤' },
  ],
};

/**
 * Food/Restaurant preset
 */
export const PRESET_FOOD: CustomTierPreset = {
  id: 'food',
  name: 'Food',
  description: "Chef's Kiss / Delicious / Tasty / Edible / Avoid",
  category: 'food',
  showUnranked: true,
  isSystem: true,
  tiers: [
    { id: 'chefs-kiss', label: 'S', displayName: "Chef's Kiss", description: 'Culinary perfection', color: createTierColor('#FF4500'), customLabel: "Chef's Kiss", order: 0, emoji: '👨‍🍳' },
    { id: 'delicious', label: 'A', displayName: 'Delicious', description: 'Outstanding flavor', color: createTierColor('#FF8C00'), customLabel: 'Delicious', order: 1, emoji: '😋' },
    { id: 'tasty', label: 'B', displayName: 'Tasty', description: 'Enjoyable eating', color: createTierColor('#FFD700'), customLabel: 'Tasty', order: 2, emoji: '😊' },
    { id: 'edible', label: 'C', displayName: 'Edible', description: 'Gets the job done', color: createTierColor('#9ACD32'), customLabel: 'Edible', order: 3, emoji: '🤷' },
    { id: 'avoid', label: 'F', displayName: 'Avoid', description: 'Not worth eating', color: createTierColor('#8B4513'), customLabel: 'Avoid', order: 4, emoji: '🤢' },
  ],
};

/**
 * Simple 3-tier preset
 */
export const PRESET_SIMPLE_3: CustomTierPreset = {
  id: 'simple-3',
  name: 'Simple (3 Tiers)',
  description: 'Best / Good / Meh',
  category: 'general',
  showUnranked: true,
  isSystem: true,
  tiers: [
    { id: 'best', label: 'S', displayName: 'Best', description: 'Top picks', color: createTierColor('#00FF00'), customLabel: 'Best', order: 0 },
    { id: 'good', label: 'B', displayName: 'Good', description: 'Solid choices', color: createTierColor('#FFFF00'), customLabel: 'Good', order: 1 },
    { id: 'meh', label: 'D', displayName: 'Meh', description: 'Nothing special', color: createTierColor('#FF0000'), customLabel: 'Meh', order: 2 },
  ],
};

/**
 * Extended 10-tier preset for detailed rankings
 */
export const PRESET_EXTENDED_10: CustomTierPreset = {
  id: 'extended-10',
  name: 'Extended (10 Tiers)',
  description: 'Detailed S+ through F- ranking',
  category: 'general',
  showUnranked: true,
  isSystem: true,
  tiers: [
    { id: 'S+', label: 'S', displayName: 'S+', description: 'Absolutely perfect', color: createTierColor('#FF0000'), customLabel: 'S+', order: 0 },
    { id: 'S', label: 'S', displayName: 'S', description: 'Near perfect', color: createTierColor('#FF4400'), customLabel: 'S', order: 1 },
    { id: 'A+', label: 'A', displayName: 'A+', description: 'Exceptional', color: createTierColor('#FF8800'), customLabel: 'A+', order: 2 },
    { id: 'A', label: 'A', displayName: 'A', description: 'Excellent', color: createTierColor('#FFBB00'), customLabel: 'A', order: 3 },
    { id: 'B+', label: 'B', displayName: 'B+', description: 'Very good', color: createTierColor('#FFEE00'), customLabel: 'B+', order: 4 },
    { id: 'B', label: 'B', displayName: 'B', description: 'Good', color: createTierColor('#CCFF00'), customLabel: 'B', order: 5 },
    { id: 'C+', label: 'C', displayName: 'C+', description: 'Above average', color: createTierColor('#88FF00'), customLabel: 'C+', order: 6 },
    { id: 'C', label: 'C', displayName: 'C', description: 'Average', color: createTierColor('#00FF44'), customLabel: 'C', order: 7 },
    { id: 'D', label: 'D', displayName: 'D', description: 'Below average', color: createTierColor('#00AAFF'), customLabel: 'D', order: 8 },
    { id: 'F', label: 'F', displayName: 'F', description: 'Poor', color: createTierColor('#8844FF'), customLabel: 'F', order: 9 },
  ],
};

// ============================================================================
// All System Presets
// ============================================================================

export const SYSTEM_TIER_PRESETS: CustomTierPreset[] = [
  PRESET_CLASSIC,
  PRESET_GOD_TIER,
  PRESET_GAMING_META,
  PRESET_FILM_CRITIC,
  PRESET_SPORTS_GOAT,
  PRESET_ANIME,
  PRESET_MUSIC_ALBUMS,
  PRESET_FOOD,
  PRESET_SIMPLE_3,
  PRESET_EXTENDED_10,
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): CustomTierPreset | undefined {
  return SYSTEM_TIER_PRESETS.find(p => p.id === id);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: string): CustomTierPreset[] {
  if (category === 'all') return SYSTEM_TIER_PRESETS;
  return SYSTEM_TIER_PRESETS.filter(p => p.category === category || p.category === 'general');
}

/**
 * Get all unique categories
 */
export function getPresetCategories(): string[] {
  const categories = new Set(SYSTEM_TIER_PRESETS.map(p => p.category));
  return ['all', ...Array.from(categories)];
}

/**
 * Create a new custom tier
 */
export function createCustomTier(
  label: string,
  color: string,
  order: number,
  description?: string
): CustomTierDefinition {
  return {
    id: `custom-${Date.now()}-${order}`,
    label: 'S', // Base label for type compatibility
    displayName: label,
    description: description || `Custom tier: ${label}`,
    color: createTierColor(color),
    customLabel: label,
    customColor: color,
    order,
  };
}

/**
 * Create a new custom preset from tiers
 */
export function createCustomPreset(
  name: string,
  description: string,
  tiers: CustomTierDefinition[],
  category = 'custom'
): CustomTierPreset {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    category,
    tiers: tiers.map((t, i) => ({ ...t, order: i })),
    showUnranked: true,
    isSystem: false,
    createdAt: Date.now(),
  };
}

/**
 * Clone a preset for customization
 */
export function clonePreset(preset: CustomTierPreset, newName?: string): CustomTierPreset {
  return {
    ...preset,
    id: `custom-${Date.now()}`,
    name: newName || `${preset.name} (Copy)`,
    isSystem: false,
    createdAt: Date.now(),
    tiers: preset.tiers.map(t => ({ ...t })),
  };
}

/**
 * Validate tier count (min 2, max 10)
 */
export function validateTierCount(count: number): boolean {
  return count >= 2 && count <= 10;
}

/**
 * Add a tier to a preset
 */
export function addTierToPreset(
  preset: CustomTierPreset,
  tier: CustomTierDefinition,
  position?: number
): CustomTierPreset {
  if (!validateTierCount(preset.tiers.length + 1)) {
    throw new Error('Cannot add tier: maximum of 10 tiers allowed');
  }

  const newTiers = [...preset.tiers];
  const insertPos = position ?? newTiers.length;
  newTiers.splice(insertPos, 0, tier);

  // Reorder
  return {
    ...preset,
    tiers: newTiers.map((t, i) => ({ ...t, order: i })),
  };
}

/**
 * Remove a tier from a preset
 */
export function removeTierFromPreset(
  preset: CustomTierPreset,
  tierId: string
): CustomTierPreset {
  if (!validateTierCount(preset.tiers.length - 1)) {
    throw new Error('Cannot remove tier: minimum of 2 tiers required');
  }

  const newTiers = preset.tiers.filter(t => t.id !== tierId);

  return {
    ...preset,
    tiers: newTiers.map((t, i) => ({ ...t, order: i })),
  };
}

/**
 * Reorder tiers in a preset
 */
export function reorderTiers(
  preset: CustomTierPreset,
  fromIndex: number,
  toIndex: number
): CustomTierPreset {
  const newTiers = [...preset.tiers];
  const [removed] = newTiers.splice(fromIndex, 1);
  newTiers.splice(toIndex, 0, removed);

  return {
    ...preset,
    tiers: newTiers.map((t, i) => ({ ...t, order: i })),
  };
}

/**
 * Update a tier in a preset
 */
export function updateTierInPreset(
  preset: CustomTierPreset,
  tierId: string,
  updates: Partial<CustomTierDefinition>
): CustomTierPreset {
  return {
    ...preset,
    tiers: preset.tiers.map(t =>
      t.id === tierId
        ? {
            ...t,
            ...updates,
            color: updates.customColor ? createTierColor(updates.customColor) : t.color,
          }
        : t
    ),
  };
}

/**
 * Serialize preset to JSON for storage/sharing
 */
export function serializePreset(preset: CustomTierPreset): string {
  return JSON.stringify({
    ...preset,
    tiers: preset.tiers.map(t => ({
      id: t.id,
      label: t.label,
      displayName: t.displayName,
      description: t.description,
      customLabel: t.customLabel,
      customColor: t.customColor || t.color.primary,
      emoji: t.emoji,
      order: t.order,
    })),
  });
}

/**
 * Deserialize preset from JSON
 */
export function deserializePreset(json: string): CustomTierPreset {
  const data = JSON.parse(json);
  return {
    ...data,
    tiers: data.tiers.map((t: { customColor?: string; [key: string]: unknown }) => ({
      ...t,
      color: createTierColor(t.customColor || '#808080'),
    })),
  };
}

/**
 * Convert custom preset to the TierConfig format used by ranking-store
 */
export function presetToTierConfig(preset: CustomTierPreset): {
  presetId: string;
  tiers: TierDefinition[];
  derivationMode: 'explicit';
} {
  return {
    presetId: preset.id,
    tiers: preset.tiers.map(t => ({
      id: t.id,
      label: t.label,
      displayName: t.customLabel || t.displayName,
      description: t.description,
      color: t.color,
    })),
    derivationMode: 'explicit',
  };
}
