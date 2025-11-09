import { NextRequest, NextResponse } from 'next/server';
import { GridItemType } from '@/types/match';

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
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();
    const { gridItems, listMetadata, style = 'modern' } = body;

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

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Image generation service not configured' },
        { status: 500 }
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

    // Build the prompt for Gemini
    const prompt = buildImagePrompt(matchedItems, listMetadata, style);

    // Call Gemini Flash Image 2.5 API
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
      return NextResponse.json(
        { error: 'Failed to generate image', details: errorData },
        { status: geminiResponse.status }
      );
    }

    const geminiData = await geminiResponse.json();

    // Extract the generated content
    // Note: Gemini Flash doesn't directly generate images, but provides text descriptions
    // For actual image generation, we'd need to use a different model or approach
    // This implementation returns structured data that can be used to render an image client-side
    const generatedContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedContent) {
      return NextResponse.json(
        { error: 'No content generated' },
        { status: 500 }
      );
    }

    // Return structured data for client-side rendering
    return NextResponse.json({
      success: true,
      data: {
        prompt,
        content: generatedContent,
        style,
        metadata: listMetadata,
        itemCount: matchedItems.length,
        items: matchedItems.map(item => ({
          position: item.position + 1,
          title: item.title,
          description: item.description,
          image_url: item.image_url,
        })),
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

function buildImagePrompt(
  items: GridItemType[],
  metadata: GenerateImageRequest['listMetadata'],
  style: string
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

  return `Create a visually striking social media shareable image design concept for:

Title: "${metadata.title}"
Category: ${metadata.category}${metadata.subcategory ? ` - ${metadata.subcategory}` : ''}
Time Period: ${timePeriodText}
Total Items: ${items.length}

Top Rankings:
${itemsList}

Design Style: ${style.toUpperCase()}
${styleDescription}

Design Requirements:
1. Create a layout that clearly shows the ranking hierarchy (top items more prominent)
2. Include the list title prominently at the top
3. Use the ${style} style aesthetic throughout
4. Make it optimized for social media sharing (1200x630px or similar)
5. Include subtle branding element that says "Created with GOAT"
6. Use color scheme that reflects the ${metadata.category} category
7. Ensure text is readable at thumbnail size
8. Create visual hierarchy with top 10 items being more prominent
9. Add subtle decorative elements that enhance without overwhelming
10. Include the time period context (${timePeriodText})

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
