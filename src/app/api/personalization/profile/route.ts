/**
 * Personalization Profile API
 * Server-side endpoints for user profile management
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for server-side fallback (would use Redis/DB in production)
const profileCache = new Map<string, {
  data: Record<string, unknown>;
  lastUpdated: number;
}>();

/**
 * GET /api/personalization/profile
 * Get user profile data (server-side fallback for new users)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const cached = profileCache.get(userId);

    if (cached) {
      return NextResponse.json({
        profile: cached.data,
        source: 'cache',
        lastUpdated: cached.lastUpdated,
      });
    }

    // Return empty profile for new users
    return NextResponse.json({
      profile: null,
      source: 'new',
      message: 'No profile found',
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/personalization/profile
 * Sync user profile to server (for cross-device persistence)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profile } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'profile is required' },
        { status: 400 }
      );
    }

    // Store profile (would persist to DB in production)
    profileCache.set(userId, {
      data: profile,
      lastUpdated: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Profile synced',
    });
  } catch (error) {
    console.error('Error syncing profile:', error);
    return NextResponse.json(
      { error: 'Failed to sync profile' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/personalization/profile
 * Clear user profile (privacy request)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    profileCache.delete(userId);

    return NextResponse.json({
      success: true,
      message: 'Profile deleted',
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}
