/**
 * Particle Theme Store
 * Manages user theme preferences and owned theme packs
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParticleThemeConfig, UserThemePreferences } from '@/types/particle-theme.types';
import { ALL_THEMES, defaultTheme } from '@/lib/particle-themes/theme-configs';

interface ParticleThemeState extends UserThemePreferences {
  // Actions
  setActiveTheme: (themeId: string) => void;
  getActiveTheme: () => ParticleThemeConfig;
  toggleSound: () => void;
  toggleHaptic: () => void;
  purchasePack: (packId: string) => void;
  isThemeUnlocked: (themeId: string) => boolean;
  getUnlockedThemes: () => ParticleThemeConfig[];
  resetToDefault: () => void;
}

const DEFAULT_PREFERENCES: UserThemePreferences = {
  activeThemeId: 'default',
  ownedPackIds: ['free-pack'],
  soundEnabled: true,
  hapticEnabled: true,
};

export const useParticleThemeStore = create<ParticleThemeState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_PREFERENCES,

      // Set active theme
      setActiveTheme: (themeId: string) => {
        const theme = ALL_THEMES.find((t) => t.id === themeId);
        if (!theme) {
          console.warn(`Theme ${themeId} not found`);
          return;
        }

        // Check if theme is unlocked
        if (!get().isThemeUnlocked(themeId)) {
          console.warn(`Theme ${themeId} is locked`);
          return;
        }

        set({ activeThemeId: themeId });
      },

      // Get current active theme config
      getActiveTheme: () => {
        const { activeThemeId } = get();
        const theme = ALL_THEMES.find((t) => t.id === activeThemeId);
        return theme || defaultTheme;
      },

      // Toggle sound effects
      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      // Toggle haptic feedback
      toggleHaptic: () => {
        set((state) => ({ hapticEnabled: !state.hapticEnabled }));
      },

      // Purchase a theme pack (simulated - integrate with payment system)
      purchasePack: (packId: string) => {
        set((state) => {
          if (state.ownedPackIds.includes(packId)) {
            return state;
          }
          return {
            ownedPackIds: [...state.ownedPackIds, packId],
          };
        });
      },

      // Check if theme is unlocked
      isThemeUnlocked: (themeId: string) => {
        const theme = ALL_THEMES.find((t) => t.id === themeId);
        if (!theme) return false;

        // Free themes are always unlocked
        if (!theme.isPremium) return true;

        // Check if user owns the pack containing this theme
        const { ownedPackIds } = get();

        // Import pack info to check ownership
        // This is a simplified check - in production, maintain theme-to-pack mapping
        return ownedPackIds.some((packId) => {
          // Check based on theme ID patterns
          if (themeId.startsWith('neon-') || themeId === 'retro-wave') {
            return packId === 'neon-pack';
          }
          if (themeId.startsWith('sakura-') || themeId === 'forest-mystic') {
            return packId === 'nature-pack';
          }
          if (themeId === 'blaze' || themeId === 'frostbite') {
            return packId === 'fire-ice-pack';
          }
          if (themeId === 'gold-rush' || themeId === 'diamond-shine') {
            return packId === 'luxury-pack';
          }
          return false;
        });
      },

      // Get all unlocked themes
      getUnlockedThemes: () => {
        return ALL_THEMES.filter((theme) => get().isThemeUnlocked(theme.id));
      },

      // Reset to default preferences
      resetToDefault: () => {
        set(DEFAULT_PREFERENCES);
      },
    }),
    {
      name: 'goat-particle-theme-storage',
      version: 1,
    }
  )
);
