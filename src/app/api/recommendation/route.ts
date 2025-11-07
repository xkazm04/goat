import { NextRequest, NextResponse } from 'next/server';
import { geminiProvider, ItemRecommendationRequest } from '@/lib/providers/gemini';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/recommendation - Get AI recommendations for an item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, subcategory } = body;

    // Validate required fields
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name and category are required' },
        { status: 400 }
      );
    }

    const recommendationRequest: ItemRecommendationRequest = {
      name: String(name).trim(),
      category: String(category).trim(),
      subcategory: subcategory ? String(subcategory).trim() : undefined
    };

    // Get recommendation from Gemini
    const recommendation = await geminiProvider.getItemRecommendation(recommendationRequest);

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error('Error in /api/recommendation:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Failed to get recommendation: ${errorMessage}` },
      { status: 500 }
    );
  }
}



