import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlueprintRow, blueprintFromRow } from '@/types/blueprint';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/blueprints/[slugOrId]/clone - Clone a blueprint and create a list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slugOrId: string }> }
) {
  try {
    const supabase = await createClient();
    const { slugOrId } = await params;
    const body = await request.json();

    // First, find the blueprint
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    let findQuery = supabase
      .from('blueprints')
      .select('*');

    if (isUUID) {
      findQuery = findQuery.eq('id', slugOrId);
    } else {
      findQuery = findQuery.eq('slug', slugOrId);
    }

    const { data: blueprintData, error: findError } = await findQuery.single();

    if (findError) {
      if (findError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Blueprint not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    const blueprint = blueprintFromRow(blueprintData as BlueprintRow);

    // Create a new list based on the blueprint
    const listData = {
      title: body.title || blueprint.title,
      category: body.category || blueprint.category,
      subcategory: body.subcategory || blueprint.subcategory,
      size: body.size || blueprint.size,
      time_period: body.timePeriod || blueprint.timePeriod,
      description: body.description || blueprint.description,
      user_id: body.userId,
      predefined: false,
      type: 'top',
      parent_list_id: blueprint.sourceListId, // Link to original if exists
    };

    // Insert the new list
    const { data: listResult, error: listError } = await supabase
      .from('lists')
      .insert([listData])
      .select()
      .single();

    if (listError) {
      console.error('Error creating list from blueprint:', listError);
      return NextResponse.json(
        { error: listError.message },
        { status: 500 }
      );
    }

    // Increment clone count on the blueprint
    await supabase
      .from('blueprints')
      .update({ clone_count: (blueprintData.clone_count || 0) + 1 })
      .eq('id', blueprintData.id);

    return NextResponse.json({
      list: listResult,
      blueprint,
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/blueprints/[slugOrId]/clone:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
