import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  BlueprintRow,
  blueprintFromRow,
  generateBlueprintSlug,
  CreateBlueprintRequest,
} from '@/types/blueprint';
import { v4 as uuidv4 } from 'uuid';
import {
  withErrorHandler,
  fromSupabaseError,
  assertRequired,
  successResponse,
  createdResponse,
} from '@/lib/errors';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// Default color for blueprints
const DEFAULT_COLOR = {
  primary: '#f59e0b',
  secondary: '#d97706',
  accent: '#fbbf24',
};

// GET /api/blueprints - Get blueprints with optional filters
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Extract query parameters
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');
  const authorId = searchParams.get('author_id');
  const isFeatured = searchParams.get('is_featured');
  const search = searchParams.get('search');
  const slug = searchParams.get('slug');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
  const sort = searchParams.get('sort') || 'recent';

  // Build query
  let query = supabase
    .from('blueprints')
    .select('*')
    .range(offset, offset + limit - 1);

  // Apply sorting
  switch (sort) {
    case 'popular':
      query = query.order('usage_count', { ascending: false });
      break;
    case 'trending':
      query = query.order('clone_count', { ascending: false });
      break;
    case 'recent':
    default:
      query = query.order('created_at', { ascending: false });
  }

  // Apply filters
  if (slug) {
    query = query.eq('slug', slug);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (subcategory) {
    query = query.eq('subcategory', subcategory);
  }
  if (authorId) {
    query = query.eq('author_id', authorId);
  }
  if (isFeatured !== null && isFeatured !== undefined) {
    query = query.eq('is_featured', isFeatured === 'true');
  }
  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw fromSupabaseError(error);
  }

  // Convert database rows to Blueprint objects
  // Cast to BlueprintRow since the DB schema matches the blueprint.ts definition
  const blueprints = (data || []).map((row) => blueprintFromRow(row as unknown as BlueprintRow));

  return successResponse(blueprints);
});

// POST /api/blueprints - Create a new blueprint
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const body: CreateBlueprintRequest = await request.json();

  // Validate required fields
  const { title, category, size } = body;
  assertRequired(title, 'title');
  assertRequired(category, 'category');
  assertRequired(size, 'size');

  // Generate ID and slug
  const id = uuidv4();
  const slug = generateBlueprintSlug(title, id);

  // Prepare blueprint data
  const blueprintData = {
    id,
    slug,
    title,
    category,
    subcategory: body.subcategory,
    size,
    time_period: body.timePeriod || 'all-time',
    description: body.description,
    color_primary: body.color?.primary || DEFAULT_COLOR.primary,
    color_secondary: body.color?.secondary || DEFAULT_COLOR.secondary,
    color_accent: body.color?.accent || DEFAULT_COLOR.accent,
    is_system: false,
    is_featured: false,
    usage_count: 0,
    clone_count: 0,
    source_list_id: body.sourceListId,
  };

  // Insert the new blueprint
  const { data, error } = await supabase
    .from('blueprints')
    .insert([blueprintData])
    .select()
    .single();

  if (error) {
    throw fromSupabaseError(error);
  }

  const blueprint = blueprintFromRow(data as unknown as BlueprintRow);

  // Generate share URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const shareUrl = `${baseUrl}/blueprint/${blueprint.slug}`;

  return createdResponse({ blueprint, shareUrl });
});
