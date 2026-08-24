import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import {
  withErrorHandler,
  fromSupabaseError,
  assertRequired,
  badRequest,
  createdResponse,
} from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import {
  BlueprintRow,
  blueprintFromRow,
  generateBlueprintSlug,
  PublishAsTemplateRequest,
} from '@/types/blueprint';

export const dynamic = 'force-dynamic';

const DEFAULT_COLOR = {
  primary: '#f59e0b',
  secondary: '#d97706',
  accent: '#fbbf24',
};

// POST /api/blueprints/publish - Publish a list as a community template
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const body: PublishAsTemplateRequest = await request.json();

  // Validate required fields
  const { listId, title, category, size, items } = body;
  assertRequired(listId, 'listId');
  assertRequired(title, 'title');
  assertRequired(category, 'category');
  assertRequired(size, 'size');

  if (!items || items.length === 0) {
    badRequest('At least one item is required to publish as template');
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Verify the list exists
  const { data: listData, error: listError } = await supabase
    .from('lists')
    .select('id, title, user_id')
    .eq('id', listId)
    .single();

  if (listError) {
    if (listError.code === 'PGRST116') {
      badRequest('List not found');
    }
    throw fromSupabaseError(listError);
  }

  // Verify ownership if user is authenticated
  if (user && listData.user_id && listData.user_id !== user.id) {
    badRequest('You can only publish your own lists as templates');
  }

  // Check if this list was already published as a template
  const { data: existing } = await supabase
    .from('blueprints')
    .select('id')
    .eq('source_list_id', listId)
    .eq('is_community', true)
    .maybeSingle();

  if (existing) {
    badRequest('This list has already been published as a community template');
  }

  // Generate ID and slug
  const id = uuidv4();
  const slug = generateBlueprintSlug(title, id);

  // Strip rankings from items - only keep title, image, description
  const sanitizedItems = items.map(item => ({
    title: item.title,
    imageUrl: item.imageUrl,
    description: item.description,
  }));

  const blueprintData = {
    id,
    slug,
    title,
    category,
    subcategory: body.subcategory,
    size,
    time_period: body.timePeriod || 'all-time',
    description: body.description,
    author: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Anonymous',
    author_id: user?.id,
    color_primary: body.color?.primary || DEFAULT_COLOR.primary,
    color_secondary: body.color?.secondary || DEFAULT_COLOR.secondary,
    color_accent: body.color?.accent || DEFAULT_COLOR.accent,
    is_system: false,
    is_featured: false,
    is_community: true,
    is_banned: false,
    usage_count: 0,
    clone_count: 0,
    avg_rating: 0,
    rating_count: 0,
    completion_rate: 0,
    item_snapshot: JSON.stringify(sanitizedItems),
    source_list_id: listId,
  };

  const { data, error } = await supabase
    .from('blueprints')
    .insert([blueprintData])
    .select()
    .single();

  if (error) {
    throw fromSupabaseError(error);
  }

  const blueprint = blueprintFromRow(data as unknown as BlueprintRow);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';
  const shareUrl = `${baseUrl}/templates?view=${blueprint.slug}`;

  return createdResponse({ blueprint, shareUrl });
});
