/**
 * Particle Theme System Types
 * Defines types for customizable particle effects in swipe animations
 */

export type ParticleShape = 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'sparkle';

export type SwipeDirectionType = 'left' | 'right';

export interface ParticleThemeColors {
  /** Colors for right swipe (positive action) */
  right: string[];
  /** Colors for left swipe (negative action) */
  left: string[];
  /** Optional indicator colors */
  rightIndicator?: string;
  leftIndicator?: string;
}

export interface ParticleThemeConfig {
  /** Unique theme identifier */
  id: string;
  /** Display name */
  name: string;
  /** Theme description */
  description: string;
  /** Color scheme for particles and indicators */
  colors: ParticleThemeColors;
  /** Particle shape */
  shape: ParticleShape;
  /** Number of particles per burst */
  particleCount: number;
  /** Particle size in pixels */
  particleSize: number;
  /** Burst radius in pixels */
  burstRadius: number;
  /** Animation duration in milliseconds */
  animationDuration: number;
  /** Whether theme is premium (requires purchase) */
  isPremium: boolean;
  /** Sound effect URL for right swipe */
  soundRight?: string;
  /** Sound effect URL for left swipe */
  soundLeft?: string;
  /** Preview image URL */
  previewImage?: string;
}

export interface ParticleThemePack {
  /** Pack identifier */
  id: string;
  /** Pack name */
  name: string;
  /** Pack description */
  description: string;
  /** Themes included in pack */
  themes: ParticleThemeConfig[];
  /** Price in cents (0 for free) */
  price: number;
  /** Preview image for the pack */
  previewImage?: string;
  /** Whether user owns this pack */
  owned?: boolean;
}

export interface UserThemePreferences {
  /** Currently active theme ID */
  activeThemeId: string;
  /** IDs of owned premium theme packs */
  ownedPackIds: string[];
  /** Sound effects enabled */
  soundEnabled: boolean;
  /** Haptic feedback enabled (mobile) */
  hapticEnabled: boolean;
}
