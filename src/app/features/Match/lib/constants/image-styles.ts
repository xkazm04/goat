/**
 * Image Style Configuration Constants
 *
 * Single source of truth for all image style configurations used in:
 * - Result image prompt generation
 * - Style selector UI in ResultImageGenerator
 */

export type ImageStyle = 'minimalist' | 'detailed' | 'abstract' | 'retro' | 'modern';

export interface StyleConfig {
  name: string;
  description: string;
  colorPalette: string[];
  typography: string;
  visualElements: string[];
}

/**
 * All available image styles with their configurations
 */
export const IMAGE_STYLES: Record<ImageStyle, StyleConfig> = {
  minimalist: {
    name: 'Minimalist',
    description: 'Clean, simple design with lots of white space, modern sans-serif typography, subtle colors, and minimal decorative elements.',
    colorPalette: ['#FFFFFF', '#F8F9FA', '#212529', '#6C757D', '#E9ECEF'],
    typography: 'Inter, SF Pro Display, or similar modern sans-serif',
    visualElements: ['Thin divider lines', 'Subtle shadows', 'Simple numbered list', 'Clean spacing'],
  },
  detailed: {
    name: 'Detailed',
    description: 'Rich visual design with ornate borders, detailed typography, vibrant colors, and decorative elements that reflect the category theme.',
    colorPalette: ['#1A1A2E', '#16213E', '#0F3460', '#E94560', '#F4A261'],
    typography: 'Playfair Display, Georgia, or serif with decorative elements',
    visualElements: ['Ornate borders', 'Category-themed icons', 'Decorative flourishes', 'Rich textures'],
  },
  abstract: {
    name: 'Abstract',
    description: 'Abstract geometric shapes, bold color gradients, modern artistic interpretation with dynamic compositions.',
    colorPalette: ['#667EEA', '#764BA2', '#F093FB', '#4FACFE', '#00F2FE'],
    typography: 'Montserrat, Poppins, or bold modern sans-serif',
    visualElements: ['Geometric shapes', 'Color gradients', 'Overlapping layers', 'Dynamic angles'],
  },
  retro: {
    name: 'Retro',
    description: 'Vintage-inspired design with retro color palettes, classic typography, nostalgic aesthetic elements from the era.',
    colorPalette: ['#FFC857', '#E9724C', '#C5283D', '#481D24', '#F7B267'],
    typography: 'Courier New, Archivo Black, or vintage display fonts',
    visualElements: ['Vintage textures', 'Retro patterns', 'Classic badges', 'Nostalgic color blocks'],
  },
  modern: {
    name: 'Modern',
    description: 'Contemporary design with bold typography, vibrant gradients, modern UI elements, and sleek visual hierarchy.',
    colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'],
    typography: 'DM Sans, Space Grotesk, or contemporary sans-serif',
    visualElements: ['Bold gradients', 'Modern cards', 'Dynamic shadows', 'Contemporary icons'],
  },
};

/**
 * Array of all available style keys for iteration in UI components
 */
export const IMAGE_STYLE_KEYS: ImageStyle[] = ['minimalist', 'detailed', 'abstract', 'retro', 'modern'];

/**
 * Get the configuration for a specific style
 */
export function getStyleConfig(style: ImageStyle): StyleConfig {
  return IMAGE_STYLES[style];
}

/**
 * Layout mapping for each style
 */
export const STYLE_LAYOUTS: Record<ImageStyle, 'grid' | 'list' | 'podium'> = {
  minimalist: 'list',
  detailed: 'list',
  abstract: 'grid',
  retro: 'list',
  modern: 'podium',
};
