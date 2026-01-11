import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateSharedRankingRequest, SharedRanking } from '@/types/share';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Generate a unique share code
function generateShareCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// POST - Create a new shared ranking
export async function POST(request: NextRequest) {
  try {
    const body: CreateSharedRankingRequest = await request.json();
    const { list_id, user_id, title, category, subcategory, time_period, items } = body;

    // Validate request
    if (!title || !category || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, and items are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Generate unique share code
    let shareCode = generateShareCode();
    let attempts = 0;
    const maxAttempts = 5;

    // Ensure share code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('shared_rankings')
        .select('id')
        .eq('share_code', shareCode)
        .single();

      if (!existing) break;
      shareCode = generateShareCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique share code' },
        { status: 500 }
      );
    }

    // Get base URL for OG image
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';
    const ogImageUrl = `${baseUrl}/api/share/og-image?code=${shareCode}`;

    // Create the shared ranking
    const { data, error } = await supabase
      .from('shared_rankings')
      .insert({
        list_id,
        user_id,
        title,
        category,
        subcategory,
        time_period,
        items,
        share_code: shareCode,
        og_image_url: ogImageUrl,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating shared ranking:', error);
      return NextResponse.json(
        { error: 'Failed to create shared ranking', details: error.message },
        { status: 500 }
      );
    }

    const shareUrl = `${baseUrl}/share/${shareCode}`;

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        share_url: shareUrl,
      },
    });
  } catch (error) {
    console.error('Error in share API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Retrieve shared rankings (supports query params)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = getSupabaseClient();

    // If code is provided, get specific shared ranking
    if (code) {
      const { data, error } = await supabase
        .from('shared_rankings')
        .select('*')
        .eq('share_code', code)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Shared ranking not found' },
          { status: 404 }
        );
      }

      // Increment view count (fire and forget)
      supabase
        .from('shared_rankings')
        .update({ view_count: data.view_count + 1 })
        .eq('id', data.id)
        .then(() => {});

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';

      return NextResponse.json({
        success: true,
        data: {
          ...data,
          share_url: `${baseUrl}/share/${data.share_code}`,
        },
      });
    }

    // If user_id is provided, get user's shared rankings
    if (userId) {
      const { data, error } = await supabase
        .from('shared_rankings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch shared rankings' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data,
      });
    }

    // Return recent popular shared rankings
    const { data, error } = await supabase
      .from('shared_rankings')
      .select('*')
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch shared rankings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in share API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
