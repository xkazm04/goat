import { GridItemType } from '@/types/match';

export type ImageStyle = 'minimalist' | 'detailed' | 'abstract' | 'retro' | 'modern';

export interface ImagePromptConfig {
  items: GridItemType[];
  listTitle: string;
  category: string;
  subcategory?: string;
  timePeriod: string;
  style: ImageStyle;
  size: number;
}

export interface StyleConfig {
  name: string;
  description: string;
  colorPalette: string[];
  typography: string;
  visualElements: string[];
}

const styleConfigs: Record<ImageStyle, StyleConfig> = {
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

export function getStyleConfig(style: ImageStyle): StyleConfig {
  return styleConfigs[style];
}

export function generateResultImagePrompt(config: ImagePromptConfig): string {
  const { items, listTitle, category, subcategory, timePeriod, style, size } = config;

  const styleConfig = getStyleConfig(style);
  const matchedItems = items.filter(item => item.matched && item.title);
  const topItems = matchedItems.slice(0, 10);
  const remainingCount = matchedItems.length - 10;

  const itemsList = matchedItems
    .map((item, index) => `${index + 1}. ${item.title}`)
    .join('\n');

  const topItemsList = topItems
    .map((item, index) => `${index + 1}. ${item.title}`)
    .join('\n');

  return `Create a visually striking social media shareable image design for a ranking list.

TITLE: "${listTitle}"
CATEGORY: ${category}${subcategory ? ` - ${subcategory}` : ''}
TIME PERIOD: ${timePeriod}
TOTAL ITEMS RANKED: ${matchedItems.length} of ${size}

TOP 10 RANKINGS:
${topItemsList}
${remainingCount > 0 ? `\n...and ${remainingCount} more` : ''}

DESIGN STYLE: ${styleConfig.name.toUpperCase()}
Style Description: ${styleConfig.description}

COLOR PALETTE:
${styleConfig.colorPalette.map((color, i) => `Color ${i + 1}: ${color}`).join('\n')}

TYPOGRAPHY:
${styleConfig.typography}

VISUAL ELEMENTS:
${styleConfig.visualElements.map(el => `- ${el}`).join('\n')}

LAYOUT REQUIREMENTS:
1. Image dimensions: 1200x630px (optimal for social sharing)
2. Header section with list title prominently displayed
3. Category and time period context clearly visible
4. Top 10 items with clear hierarchy (larger text/prominence for #1)
5. Visual indication of remaining items if any (e.g., "+40 more")
6. Footer with subtle "Created with GOAT" branding
7. Ensure readability at thumbnail size (minimum 14px font for body text)

COMPOSITION:
- Top 20%: Header with title and context
- Middle 65%: Ranked items with visual hierarchy
- Bottom 15%: Footer with branding and call-to-action

VISUAL HIERARCHY:
- #1 item: Most prominent, largest text, special visual treatment
- #2-3 items: Secondary prominence, medium-large text
- #4-10 items: Standard size, clean readable text
- Items indicator: Small text showing total count

ADDITIONAL DESIGN ELEMENTS:
1. Subtle gradient background that doesn't compete with text
2. Semi-transparent overlay for better text contrast
3. Category-themed decorative element (subtle, not distracting)
4. Modern card or container design for the ranking list
5. Proper padding and whitespace for breathing room

ACCESSIBILITY:
- Minimum contrast ratio 4.5:1 for text
- Clear visual separation between ranking tiers
- Avoid relying solely on color to convey information

OUTPUT FORMAT:
Provide a detailed JSON-like description including:
- Exact layout measurements and positioning
- Specific hex color codes for each element
- Font sizes and weights for each text tier
- Background treatment specifics
- How to style each ranking position
- Decorative element placement and styling`;
}

export function generatePromptForCanvas(
  items: GridItemType[],
  listTitle: string,
  category: string,
  style: ImageStyle = 'modern'
): {
  backgroundGradient: string[];
  titleColor: string;
  itemColors: string[];
  fontSize: { title: number; item: number; position: number };
  layout: 'grid' | 'list' | 'podium';
} {
  const styleConfig = getStyleConfig(style);

  const layouts: Record<ImageStyle, 'grid' | 'list' | 'podium'> = {
    minimalist: 'list',
    detailed: 'list',
    abstract: 'grid',
    retro: 'list',
    modern: 'podium',
  };

  return {
    backgroundGradient: styleConfig.colorPalette.slice(0, 2),
    titleColor: styleConfig.colorPalette[2] || '#FFFFFF',
    itemColors: styleConfig.colorPalette,
    fontSize: {
      title: style === 'minimalist' ? 48 : 56,
      item: style === 'minimalist' ? 18 : 22,
      position: style === 'minimalist' ? 24 : 32,
    },
    layout: layouts[style],
  };
}

export function calculateImageHash(items: GridItemType[], metadata: any): string {
  const itemIds = items
    .filter(item => item.matched)
    .sort((a, b) => a.position - b.position)
    .map(item => `${item.position}:${item.backlogItemId || item.id}`)
    .join('|');

  const metadataString = JSON.stringify({
    title: metadata.title,
    category: metadata.category,
    size: metadata.size,
  });

  // Simple hash function
  let hash = 0;
  const str = `${itemIds}|${metadataString}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
