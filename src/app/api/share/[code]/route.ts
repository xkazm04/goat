import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

interface RouteParams {
  params: Promise<{ code: string }>;
}

// GET - Retrieve a specific shared ranking by code
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Share code is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

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

    // Atomic increment (Postgres RPC) — a JS read-modify-write loses concurrent
    // views under traffic, systematically under-counting this social-proof stat.
    await supabase.rpc('increment_share_view_count', { share_id: data.id });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        share_url: `${baseUrl}/share/${data.share_code}`,
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

// POST - Challenge this ranking (create a copy for the user to make their own)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { user_id } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Share code is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Get the original shared ranking
    const { data: original, error: fetchError } = await supabase
      .from('shared_rankings')
      .select('*')
      .eq('share_code', code)
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: 'Original shared ranking not found' },
        { status: 404 }
      );
    }

    // Atomic increment (Postgres RPC) — avoids lost concurrent challenges.
    await supabase.rpc('increment_share_challenge_count', { share_id: original.id });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';

    // Return the challenge data for creating a new list
    return NextResponse.json({
      success: true,
      data: {
        challenge_from: {
          id: original.id,
          share_code: original.share_code,
          title: original.title,
          category: original.category,
          subcategory: original.subcategory,
        },
        list_config: {
          title: original.title,
          category: original.category,
          subcategory: original.subcategory,
          time_period: original.time_period,
          size: original.items?.length || 10,
        },
        redirect_url: `${baseUrl}/?challenge=${code}`,
      },
    });
  } catch (error) {
    console.error('Error in challenge API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
