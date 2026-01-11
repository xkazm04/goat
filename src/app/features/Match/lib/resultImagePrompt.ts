import { GridItemType } from '@/types/match';
import {
  ImageStyle,
  StyleConfig,
  getStyleConfig,
  STYLE_LAYOUTS,
} from './constants/image-styles';

// Re-export types and functions for backwards compatibility
export type { ImageStyle, StyleConfig };
export { getStyleConfig };

export interface ImagePromptConfig {
  items: GridItemType[];
  listTitle: string;
  category: string;
  subcategory?: string;
  timePeriod: string;
  style: ImageStyle;
  size: number;
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

  return {
    backgroundGradient: styleConfig.colorPalette.slice(0, 2),
    titleColor: styleConfig.colorPalette[2] || '#FFFFFF',
    itemColors: styleConfig.colorPalette,
    fontSize: {
      title: style === 'minimalist' ? 48 : 56,
      item: style === 'minimalist' ? 18 : 22,
      position: style === 'minimalist' ? 24 : 32,
    },
    layout: STYLE_LAYOUTS[style],
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
