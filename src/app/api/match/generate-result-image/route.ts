import { NextRequest, NextResponse } from 'next/server';
import { GridItemType } from '@/types/match';
import {
  LayoutEngine,
  BalanceOptimizer,
  PlaceholderGenerator,
  ColorAnalyzer,
  type Layout,
  type LayoutItem,
  type LayoutType,
  type ExtractedColors,
  type BalanceAnalysis,
  type ColorHarmony,
} from '@/lib/image-gen';

interface GenerateImageRequest {
  gridItems: GridItemType[];
  listMetadata: {
    title: string;
    category: string;
    subcategory?: string;
    size: number;
    timePeriod?: string;
    selectedDecade?: number;
    selectedYear?: number;
  };
  style?: 'minimalist' | 'detailed' | 'abstract' | 'retro' | 'modern';
  layoutType?: LayoutType;
  targetWidth?: number;
  targetHeight?: number;
}

interface CompositionResult {
  layout: Layout;
  balance: BalanceAnalysis;
  colorHarmony: ColorHarmony | null;
  placeholders: Map<number, string>;
  suggestedLayouts: LayoutType[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();
    const {
      gridItems,
      listMetadata,
      style = 'modern',
      layoutType,
      targetWidth = 1200,
      targetHeight = 630,
    } = body;

    // Validate request
    if (!gridItems || !Array.isArray(gridItems) || gridItems.length === 0) {
      return NextResponse.json(
        { error: 'Invalid grid items provided' },
        { status: 400 }
      );
    }

    if (!listMetadata || !listMetadata.title) {
      return NextResponse.json(
        { error: 'Invalid list metadata provided' },
        { status: 400 }
      );
    }

    // Filter matched items and sort by position
    const matchedItems = gridItems
      .filter(item => item.matched && item.title)
      .sort((a, b) => a.position - b.position);

    if (matchedItems.length === 0) {
      return NextResponse.json(
        { error: 'No matched items to generate image from' },
        { status: 400 }
      );
    }

    // Generate smart composition
    const composition = generateSmartComposition(
      matchedItems,
      targetWidth,
      targetHeight,
      layoutType
    );

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return composition data without AI enhancement
      return NextResponse.json({
        success: true,
        data: {
          composition: {
            layout: composition.layout,
            balance: composition.balance,
            suggestedLayouts: composition.suggestedLayouts,
            placeholders: Object.fromEntries(composition.placeholders),
          },
          style,
          metadata: listMetadata,
          itemCount: matchedItems.length,
          items: matchedItems.map((item, index) => ({
            position: item.position + 1,
            title: item.title,
            description: item.description,
            image_url: item.image_url,
            cell: composition.layout.cells[index],
            placeholder: item.image_url ? null : composition.placeholders.get(index),
          })),
          aiEnhanced: false,
        },
      });
    }

    // Build the prompt for Gemini with composition data
    const prompt = buildImagePrompt(matchedItems, listMetadata, style, composition);

    // Call Gemini Flash API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Gemini API error:', errorData);
      // Still return composition data on API error
      return NextResponse.json({
        success: true,
        data: {
          composition: {
            layout: composition.layout,
            balance: composition.balance,
            suggestedLayouts: composition.suggestedLayouts,
            placeholders: Object.fromEntries(composition.placeholders),
          },
          style,
          metadata: listMetadata,
          itemCount: matchedItems.length,
          items: matchedItems.map((item, index) => ({
            position: item.position + 1,
            title: item.title,
            description: item.description,
            image_url: item.image_url,
            cell: composition.layout.cells[index],
            placeholder: item.image_url ? null : composition.placeholders.get(index),
          })),
          aiEnhanced: false,
          aiError: 'Gemini API unavailable',
        },
      });
    }

    const geminiData = await geminiResponse.json();
    const generatedContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    // Return enhanced data with composition
    return NextResponse.json({
      success: true,
      data: {
        prompt,
        content: generatedContent,
        composition: {
          layout: composition.layout,
          balance: composition.balance,
          colorHarmony: composition.colorHarmony,
          suggestedLayouts: composition.suggestedLayouts,
          placeholders: Object.fromEntries(composition.placeholders),
        },
        style,
        metadata: listMetadata,
        itemCount: matchedItems.length,
        items: matchedItems.map((item, index) => ({
          position: item.position + 1,
          title: item.title,
          description: item.description,
          image_url: item.image_url,
          cell: composition.layout.cells[index],
          placeholder: item.image_url ? null : composition.placeholders.get(index),
        })),
        aiEnhanced: !!generatedContent,
      },
    });
  } catch (error) {
    console.error('Error generating result image:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate smart composition for the grid items
 */
function generateSmartComposition(
  items: GridItemType[],
  targetWidth: number,
  targetHeight: number,
  preferredLayout?: LayoutType
): CompositionResult {
  // Initialize engines
  const layoutEngine = new LayoutEngine({
    targetWidth,
    targetHeight,
  });
  const balanceOptimizer = new BalanceOptimizer(targetWidth, targetHeight);
  const placeholderGenerator = new PlaceholderGenerator({
    width: Math.floor(targetWidth / 4),
    height: Math.floor(targetHeight / 4),
  });
  const colorAnalyzer = new ColorAnalyzer();

  // Convert grid items to layout items
  const layoutItems: LayoutItem[] = items.map((item, index) => ({
    id: item.id || `item-${index}`,
    aspectRatio: item.image_url ? estimateAspectRatio(item.image_url) : 1,
    importance: calculateImportance(index, items.length),
    hasImage: !!item.image_url,
    rank: index + 1,
    title: item.title,
  }));

  // Generate layout
  let layout = layoutEngine.generateLayout(layoutItems, {
    layoutType: preferredLayout,
    padding: 16,
    spacing: 12,
  });

  // Optimize for visual balance
  layout = balanceOptimizer.optimizeLayout(layout, 5);

  // Analyze balance
  const balance = balanceOptimizer.analyzeBalance(layout);

  // Get layout suggestions
  const suggestedLayouts = layoutEngine.suggestLayouts(layoutItems);

  // Generate placeholders for items without images
  const placeholders = new Map<number, string>();
  items.forEach((item, index) => {
    if (!item.image_url) {
      const placeholder = placeholderGenerator.generateDataURL(
        index + 1,
        item.title
      );
      placeholders.set(index, placeholder);
    }
  });

  // Analyze color harmony if we have items with colors
  // In a full implementation, we would extract colors from actual images
  let colorHarmony: ColorHarmony | null = null;

  // Create mock color sets for demonstration
  // In production, these would come from actual image analysis
  const mockColorSets: ExtractedColors[] = items
    .filter(item => item.image_url)
    .slice(0, 5)
    .map(() => ({
      dominant: generateCategoryColor(items[0]?.title || ''),
      accent: generateAccentColor(),
      palette: [generateCategoryColor(items[0]?.title || ''), generateAccentColor()],
    }));

  if (mockColorSets.length > 0) {
    colorHarmony = colorAnalyzer.analyzeHarmony(mockColorSets);
  }

  return {
    layout,
    balance,
    colorHarmony,
    placeholders,
    suggestedLayouts,
  };
}

/**
 * Estimate aspect ratio from image URL
 * In production, this would use actual image dimensions
 */
function estimateAspectRatio(imageUrl: string): number {
  // Default to common aspect ratios
  if (imageUrl.includes('poster') || imageUrl.includes('movie')) {
    return 0.67; // 2:3 portrait
  }
  if (imageUrl.includes('album') || imageUrl.includes('cover')) {
    return 1; // Square
  }
  if (imageUrl.includes('landscape') || imageUrl.includes('banner')) {
    return 1.78; // 16:9
  }
  return 1; // Default square
}

/**
 * Calculate importance based on position
 * Top positions are more important
 */
function calculateImportance(index: number, total: number): number {
  if (total <= 3) {
    return index === 0 ? 1 : 0.8;
  }
  if (index === 0) return 1; // #1
  if (index <= 2) return 0.9; // Top 3
  if (index <= 9) return 0.7; // Top 10
  if (index <= 24) return 0.5; // Top 25
  return 0.3;
}

/**
 * Generate a category-appropriate color based on title
 */
function generateCategoryColor(title: string): string {
  // Create a hash from the title
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash = hash & hash;
  }

  // Generate hue from hash
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 40%)`;
}

/**
 * Generate an accent color
 */
function generateAccentColor(): string {
  const hues = [340, 200, 160, 280, 40]; // Pink, Blue, Teal, Purple, Orange
  const hue = hues[Math.floor(Math.random() * hues.length)];
  return `hsl(${hue}, 80%, 50%)`;
}

function buildImagePrompt(
  items: GridItemType[],
  metadata: GenerateImageRequest['listMetadata'],
  style: string,
  composition: CompositionResult
): string {
  const timePeriodText = metadata.timePeriod === 'decade' && metadata.selectedDecade
    ? `${metadata.selectedDecade}s`
    : metadata.timePeriod === 'year' && metadata.selectedYear
    ? `${metadata.selectedYear}`
    : 'All Time';

  const itemsList = items
    .slice(0, 50) // Limit to top 50
    .map((item, index) => `${index + 1}. ${item.title}`)
    .join('\n');

  const styleDescriptions = {
    minimalist: 'Clean, simple design with lots of white space, modern sans-serif typography, subtle colors, and minimal decorative elements.',
    detailed: 'Rich visual design with ornate borders, detailed typography, vibrant colors, and decorative elements that reflect the category theme.',
    abstract: 'Abstract geometric shapes, bold color gradients, modern artistic interpretation with dynamic compositions.',
    retro: 'Vintage-inspired design with retro color palettes, classic typography, nostalgic aesthetic elements from the era.',
    modern: 'Contemporary design with bold typography, vibrant gradients, modern UI elements, and sleek visual hierarchy.',
  };

  const styleDescription = styleDescriptions[style as keyof typeof styleDescriptions] || styleDescriptions.modern;

  // Include composition analysis in prompt
  const balanceInfo = composition.balance;
  const layoutInfo = composition.layout;

  return `Create a visually striking social media shareable image design concept for:

Title: "${metadata.title}"
Category: ${metadata.category}${metadata.subcategory ? ` - ${metadata.subcategory}` : ''}
Time Period: ${timePeriodText}
Total Items: ${items.length}

Top Rankings:
${itemsList}

Design Style: ${style.toUpperCase()}
${styleDescription}

Layout Analysis:
- Layout Type: ${layoutInfo.type}
- Visual Balance Score: ${(balanceInfo.overallBalance * 100).toFixed(0)}%
- Symmetry Score: ${(balanceInfo.symmetryScore * 100).toFixed(0)}%
- Distribution Score: ${(balanceInfo.distributionScore * 100).toFixed(0)}%
- Center of Mass: (${balanceInfo.centerOfMass.x.toFixed(0)}, ${balanceInfo.centerOfMass.y.toFixed(0)})

${composition.colorHarmony ? `
Color Analysis:
- Harmony Type: ${composition.colorHarmony.type}
- Harmony Score: ${(composition.colorHarmony.score * 100).toFixed(0)}%
- Contrast Ratio: ${composition.colorHarmony.contrastRatio.toFixed(2)}
- Accessibility: ${composition.colorHarmony.isAccessible ? 'WCAG AA Compliant' : 'Needs Improvement'}
` : ''}

Design Requirements:
1. Create a layout that clearly shows the ranking hierarchy (top items more prominent)
2. Include the list title prominently at the top
3. Use the ${style} style aesthetic throughout
4. Make it optimized for social media sharing (${layoutInfo.dimensions.width}x${layoutInfo.dimensions.height}px)
5. Include subtle branding element that says "Created with GOAT"
6. Use color scheme that reflects the ${metadata.category} category
7. Ensure text is readable at thumbnail size
8. Create visual hierarchy with top 10 items being more prominent
9. Add subtle decorative elements that enhance without overwhelming
10. Include the time period context (${timePeriodText})

Based on the ${layoutInfo.type} layout type, ensure:
- ${layoutInfo.type === 'podium' ? 'Top 3 items displayed prominently like a winners podium' : ''}
- ${layoutInfo.type === 'featured' ? 'First item takes prominent center/top position' : ''}
- ${layoutInfo.type === 'grid' ? 'Items arranged in a balanced grid with equal emphasis' : ''}
- ${layoutInfo.type === 'pyramid' ? 'Items cascade down from most to least important' : ''}
- ${layoutInfo.type === 'masonry' ? 'Items flow naturally with varied sizes' : ''}

Output a detailed description of the image design that includes:
- Layout structure and composition
- Color palette (specific hex codes)
- Typography choices (fonts and sizes)
- Visual hierarchy details
- Decorative elements and their placement
- How to represent each ranking tier visually
- Background treatment
- Call-to-action or sharing message placement

Make this design description detailed enough that it could be implemented directly in code using HTML/CSS/Canvas.`;
}
