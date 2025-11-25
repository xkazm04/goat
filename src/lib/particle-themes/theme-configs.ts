/**
 * Particle Theme Configurations
 * Predefined themes and theme packs for swipe animations
 */

import type { ParticleThemeConfig, ParticleThemePack } from '@/types/particle-theme.types';

// ==================== FREE THEMES ====================

export const defaultTheme: ParticleThemeConfig = {
  id: 'default',
  name: 'Classic',
  description: 'The original G.O.A.T. experience',
  colors: {
    right: ['#10b981', '#34d399', '#6ee7b7'],
    left: ['#ef4444', '#f87171', '#fca5a5'],
    rightIndicator: '#10b981',
    leftIndicator: '#ef4444',
  },
  shape: 'circle',
  particleCount: 12,
  particleSize: 12,
  burstRadius: 100,
  animationDuration: 500,
  isPremium: false,
};

export const minimalTheme: ParticleThemeConfig = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean and understated',
  colors: {
    right: ['#64748b', '#94a3b8', '#cbd5e1'],
    left: ['#475569', '#64748b', '#94a3b8'],
    rightIndicator: '#64748b',
    leftIndicator: '#475569',
  },
  shape: 'square',
  particleCount: 8,
  particleSize: 8,
  burstRadius: 80,
  animationDuration: 400,
  isPremium: false,
};

export const oceanTheme: ParticleThemeConfig = {
  id: 'ocean',
  name: 'Ocean Wave',
  description: 'Cool blues and aqua tones',
  colors: {
    right: ['#06b6d4', '#22d3ee', '#67e8f9'],
    left: ['#0284c7', '#0ea5e9', '#38bdf8'],
    rightIndicator: '#06b6d4',
    leftIndicator: '#0284c7',
  },
  shape: 'circle',
  particleCount: 15,
  particleSize: 10,
  burstRadius: 110,
  animationDuration: 600,
  isPremium: false,
};

// ==================== PREMIUM THEMES ====================

// Neon Pack
export const neonGlowTheme: ParticleThemeConfig = {
  id: 'neon-glow',
  name: 'Neon Glow',
  description: 'Electric cyberpunk vibes',
  colors: {
    right: ['#ff00ff', '#ff1aff', '#ff4dff'],
    left: ['#00ffff', '#1affff', '#4dffff'],
    rightIndicator: '#ff00ff',
    leftIndicator: '#00ffff',
  },
  shape: 'star',
  particleCount: 20,
  particleSize: 14,
  burstRadius: 120,
  animationDuration: 700,
  isPremium: true,
  soundRight: '/sounds/neon-right.mp3',
  soundLeft: '/sounds/neon-left.mp3',
};

export const retroWaveTheme: ParticleThemeConfig = {
  id: 'retro-wave',
  name: 'Retro Wave',
  description: '80s synthwave aesthetic',
  colors: {
    right: ['#f72585', '#7209b7', '#4361ee'],
    left: ['#ff006e', '#fb5607', '#ffbe0b'],
    rightIndicator: '#7209b7',
    leftIndicator: '#ff006e',
  },
  shape: 'triangle',
  particleCount: 18,
  particleSize: 16,
  burstRadius: 130,
  animationDuration: 650,
  isPremium: true,
  soundRight: '/sounds/retro-right.mp3',
  soundLeft: '/sounds/retro-left.mp3',
};

// Nature Pack
export const sakuraBloomTheme: ParticleThemeConfig = {
  id: 'sakura-bloom',
  name: 'Sakura Bloom',
  description: 'Delicate cherry blossom petals',
  colors: {
    right: ['#ffc0cb', '#ffb3d9', '#ffa6c9'],
    left: ['#fff0f5', '#ffe4e1', '#ffd1dc'],
    rightIndicator: '#ffc0cb',
    leftIndicator: '#fff0f5',
  },
  shape: 'heart',
  particleCount: 16,
  particleSize: 12,
  burstRadius: 100,
  animationDuration: 800,
  isPremium: true,
  soundRight: '/sounds/nature-right.mp3',
  soundLeft: '/sounds/nature-left.mp3',
};

export const forestMysticTheme: ParticleThemeConfig = {
  id: 'forest-mystic',
  name: 'Forest Mystic',
  description: 'Enchanted woodland magic',
  colors: {
    right: ['#10b981', '#059669', '#047857'],
    left: ['#84cc16', '#65a30d', '#4d7c0f'],
    rightIndicator: '#059669',
    leftIndicator: '#65a30d',
  },
  shape: 'sparkle',
  particleCount: 14,
  particleSize: 13,
  burstRadius: 105,
  animationDuration: 750,
  isPremium: true,
  soundRight: '/sounds/nature-right.mp3',
  soundLeft: '/sounds/nature-left.mp3',
};

// Fire & Ice Pack
export const blazeTheme: ParticleThemeConfig = {
  id: 'blaze',
  name: 'Blaze',
  description: 'Fierce flames of passion',
  colors: {
    right: ['#ff4500', '#ff6347', '#ff8c00'],
    left: ['#dc143c', '#ff1493', '#ff69b4'],
    rightIndicator: '#ff4500',
    leftIndicator: '#dc143c',
  },
  shape: 'triangle',
  particleCount: 22,
  particleSize: 15,
  burstRadius: 125,
  animationDuration: 550,
  isPremium: true,
  soundRight: '/sounds/fire-right.mp3',
  soundLeft: '/sounds/fire-left.mp3',
};

export const frostbiteTheme: ParticleThemeConfig = {
  id: 'frostbite',
  name: 'Frostbite',
  description: 'Icy crystalline burst',
  colors: {
    right: ['#e0f2fe', '#bae6fd', '#7dd3fc'],
    left: ['#dbeafe', '#bfdbfe', '#93c5fd'],
    rightIndicator: '#7dd3fc',
    leftIndicator: '#93c5fd',
  },
  shape: 'star',
  particleCount: 20,
  particleSize: 11,
  burstRadius: 115,
  animationDuration: 700,
  isPremium: true,
  soundRight: '/sounds/ice-right.mp3',
  soundLeft: '/sounds/ice-left.mp3',
};

// Gold & Luxury Pack
export const goldRushTheme: ParticleThemeConfig = {
  id: 'gold-rush',
  name: 'Gold Rush',
  description: 'Luxurious golden sparkle',
  colors: {
    right: ['#ffd700', '#ffdf00', '#ffed4e'],
    left: ['#ffa500', '#ffb347', '#ffc966'],
    rightIndicator: '#ffd700',
    leftIndicator: '#ffa500',
  },
  shape: 'star',
  particleCount: 18,
  particleSize: 14,
  burstRadius: 110,
  animationDuration: 600,
  isPremium: true,
  soundRight: '/sounds/gold-right.mp3',
  soundLeft: '/sounds/gold-left.mp3',
};

export const diamondShineTheme: ParticleThemeConfig = {
  id: 'diamond-shine',
  name: 'Diamond Shine',
  description: 'Premium crystal brilliance',
  colors: {
    right: ['#ffffff', '#f0f0f0', '#e8e8e8'],
    left: ['#e0e0e0', '#d8d8d8', '#d0d0d0'],
    rightIndicator: '#ffffff',
    leftIndicator: '#e0e0e0',
  },
  shape: 'sparkle',
  particleCount: 24,
  particleSize: 10,
  burstRadius: 130,
  animationDuration: 700,
  isPremium: true,
  soundRight: '/sounds/diamond-right.mp3',
  soundLeft: '/sounds/diamond-left.mp3',
};

// ==================== THEME PACKS ====================

export const freeThemePack: ParticleThemePack = {
  id: 'free-pack',
  name: 'Free Themes',
  description: 'Essential themes included with G.O.A.T.',
  themes: [defaultTheme, minimalTheme, oceanTheme],
  price: 0,
  owned: true,
};

export const neonThemePack: ParticleThemePack = {
  id: 'neon-pack',
  name: 'Neon Collection',
  description: 'Electrifying cyberpunk-inspired effects',
  themes: [neonGlowTheme, retroWaveTheme],
  price: 299, // $2.99
};

export const natureThemePack: ParticleThemePack = {
  id: 'nature-pack',
  name: 'Nature Collection',
  description: 'Organic and enchanting natural themes',
  themes: [sakuraBloomTheme, forestMysticTheme],
  price: 299, // $2.99
};

export const fireIceThemePack: ParticleThemePack = {
  id: 'fire-ice-pack',
  name: 'Fire & Ice Collection',
  description: 'Extreme elemental contrasts',
  themes: [blazeTheme, frostbiteTheme],
  price: 299, // $2.99
};

export const luxuryThemePack: ParticleThemePack = {
  id: 'luxury-pack',
  name: 'Luxury Collection',
  description: 'Premium precious metal effects',
  themes: [goldRushTheme, diamondShineTheme],
  price: 499, // $4.99
};

// ==================== EXPORTS ====================

export const ALL_THEMES: ParticleThemeConfig[] = [
  defaultTheme,
  minimalTheme,
  oceanTheme,
  neonGlowTheme,
  retroWaveTheme,
  sakuraBloomTheme,
  forestMysticTheme,
  blazeTheme,
  frostbiteTheme,
  goldRushTheme,
  diamondShineTheme,
];

export const ALL_THEME_PACKS: ParticleThemePack[] = [
  freeThemePack,
  neonThemePack,
  natureThemePack,
  fireIceThemePack,
  luxuryThemePack,
];

export const FREE_THEMES: ParticleThemeConfig[] = ALL_THEMES.filter(
  (theme) => !theme.isPremium
);

export const PREMIUM_THEMES: ParticleThemeConfig[] = ALL_THEMES.filter(
  (theme) => theme.isPremium
);
