import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/challenges/[id]/entries - Get entries for a challenge
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;

    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Get challenge entries with user data
    const { data, error } = await supabase
      .from('challenge_entries')
      .select(`
        *,
        lists(id, title)
      `)
      .eq('challenge_id', id)
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching challenge entries:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in GET /api/challenges/[id]/entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/challenges/[id]/entries - Submit an entry to a challenge
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id: challenge_id } = params;
    const body = await request.json();

    const { user_id, list_id, score, completion_time } = body;

    if (!user_id || !list_id || score === undefined || completion_time === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, list_id, score, and completion_time are required' },
        { status: 400 }
      );
    }

    // Verify the challenge exists and is active
    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges')
      .select('id, status, end_date')
      .eq('id', challenge_id)
      .single();

    if (challengeError || !challengeData) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    if (challengeData.status !== 'active') {
      return NextResponse.json(
        { error: 'Challenge is not active' },
        { status: 400 }
      );
    }

    if (challengeData.end_date && new Date(challengeData.end_date) < new Date()) {
      return NextResponse.json(
        { error: 'Challenge has ended' },
        { status: 400 }
      );
    }

    // Insert the entry (upsert to update if user already submitted)
    const { data, error } = await supabase
      .from('challenge_entries')
      .upsert(
        {
          challenge_id,
          user_id,
          list_id,
          score,
          completion_time,
          submitted_at: new Date().toISOString(),
        },
        {
          onConflict: 'challenge_id,user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error submitting challenge entry:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Recalculate ranks for this challenge
    const { error: rankError } = await supabase.rpc('update_challenge_ranks', {
      challenge_uuid: challenge_id,
    });

    if (rankError) {
      console.error('Error updating ranks:', rankError);
    }

    // Fetch the updated entry with rank
    const { data: updatedEntry, error: fetchError } = await supabase
      .from('challenge_entries')
      .select('*')
      .eq('id', data.id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated entry:', fetchError);
      return NextResponse.json(data, { status: 201 });
    }

    return NextResponse.json(updatedEntry, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/challenges/[id]/entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
