import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// POST /api/achievement/share - Create a shareable achievement link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { achievement_id, user_id, config } = body;

    if (!achievement_id) {
      return NextResponse.json(
        { success: false, error: 'Achievement ID is required' },
        { status: 400 }
      );
    }

    // Generate unique share code
    const shareCode = nanoid(10);

    // Build share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/achievement/${shareCode}`;

    // Generate OG image URL (will be rendered on-demand)
    const ogImageUrl = `${baseUrl}/api/achievement/og?code=${shareCode}`;

    // Generate embed code
    const embedCode = `<iframe src="${shareUrl}/embed" width="400" height="300" frameborder="0" title="G.O.A.T. Achievement"></iframe>`;

    // In a real implementation, this would:
    // 1. Verify the achievement exists
    // 2. Verify the user owns the achievement (if user_id provided)
    // 3. Store the share record in the database
    // 4. Return the share details

    // For now, return mock success response
    return NextResponse.json({
      success: true,
      data: {
        share_url: shareUrl,
        share_code: shareCode,
        og_image_url: ogImageUrl,
        embed_code: embedCode,
      },
    });
  } catch (error) {
    console.error('Error creating achievement share:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create shareable link' },
      { status: 500 }
    );
  }
}

// GET /api/achievement/share - Get shared achievement by code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Share code is required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would:
    // 1. Look up the share record by code
    // 2. Increment view count
    // 3. Return the achievement data with config

    // For now, return mock data
    return NextResponse.json({
      success: true,
      data: {
        share_code: code,
        achievement: {
          id: 'mock-achievement',
          slug: 'first-ranking',
          title: 'First Ranking',
          description: 'Complete your first ranking',
          category: 'curator',
          tier: 'bronze',
          icon: 'Trophy',
          points: 100,
          rarity: 75,
          unlocked: true,
          unlockedAt: new Date().toISOString(),
        },
        config: {
          style: 'default',
          showUsername: true,
          showProgress: true,
          showRarity: true,
          showDate: true,
          animated: false,
        },
        username: 'Demo User',
        view_count: 1,
      },
    });
  } catch (error) {
    console.error('Error fetching shared achievement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shared achievement' },
      { status: 500 }
    );
  }
}
