import { NextRequest, NextResponse } from 'next/server';
import { geminiProvider } from '@/lib/providers/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow up to 30 seconds for Gemini API calls

/**
 * POST /api/admin/search-image
 * Search for an image URL using Gemini AI with web search
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemName, category, subcategory } = body;

    if (!itemName) {
      return NextResponse.json(
        { error: 'itemName is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Searching for image:', { itemName, category, subcategory });

    // Use Gemini to search for the item information including image
    const recommendation = await geminiProvider.getItemRecommendation({
      name: itemName,
      category: category || 'general',
      subcategory
    });

    console.log('✅ Gemini recommendation:', recommendation);

    // Return the found image URL and other metadata
    return NextResponse.json({
      success: true,
      image_url: recommendation.image_url || null,
      description: recommendation.description || null,
      reference_url: recommendation.reference_url || null,
      confidence: recommendation.confidence || 0,
      item_year: recommendation.item_year || null,
      item_year_to: recommendation.item_year_to || null
    });
  } catch (error) {
    console.error('Error searching for image:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search for image'
      },
      { status: 500 }
    );
  }
}
