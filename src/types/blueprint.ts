// Blueprint System Types
// A Blueprint is a shareable list configuration that can be created by users,
// shared via URL, stored in the database, and loaded dynamically

import { LucideIcon } from 'lucide-react';

// Color scheme for visual theming
export interface BlueprintColor {
  primary: string;
  secondary: string;
  accent: string;
}

// Position for showcase card display
export interface BlueprintDisplayPosition {
  x: number;
  y: number;
}

// Core Blueprint entity - the unified type for both system presets and user-created blueprints
export interface Blueprint {
  // Identity
  id: string;
  slug?: string; // URL-friendly identifier for sharing

  // List configuration
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  timePeriod: 'all-time' | 'decade' | 'year';

  // Metadata
  description?: string;
  author?: string;
  authorId?: string;

  // Visual theming
  color: BlueprintColor;

  // Display properties (for showcase cards)
  displayPosition?: BlueprintDisplayPosition;
  rotation?: number;
  scale?: number;

  // Flags
  isSystem?: boolean; // System preset (not editable)
  isFeatured?: boolean; // Show in featured section
  isBanned?: boolean; // Special visual treatment (e.g., hip-hop showcase card)

  // Analytics
  usageCount?: number;
  cloneCount?: number;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;

  // Source list (if cloned from existing list)
  sourceListId?: string;
}

// Database representation (snake_case)
export interface BlueprintRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  time_period: string;
  description?: string;
  author?: string;
  author_id?: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  is_system: boolean;
  is_featured: boolean;
  usage_count: number;
  clone_count: number;
  source_list_id?: string;
  created_at: string;
  updated_at: string;
}

// Convert database row to Blueprint
export function blueprintFromRow(row: BlueprintRow): Blueprint {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    subcategory: row.subcategory,
    size: row.size,
    timePeriod: row.time_period as Blueprint['timePeriod'],
    description: row.description,
    author: row.author,
    authorId: row.author_id,
    color: {
      primary: row.color_primary,
      secondary: row.color_secondary,
      accent: row.color_accent,
    },
    isSystem: row.is_system,
    isFeatured: row.is_featured,
    usageCount: row.usage_count,
    cloneCount: row.clone_count,
    sourceListId: row.source_list_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert Blueprint to database row format for insert/update
export function blueprintToRow(blueprint: Partial<Blueprint>): Partial<BlueprintRow> {
  const row: Partial<BlueprintRow> = {};

  if (blueprint.id !== undefined) row.id = blueprint.id;
  if (blueprint.slug !== undefined) row.slug = blueprint.slug;
  if (blueprint.title !== undefined) row.title = blueprint.title;
  if (blueprint.category !== undefined) row.category = blueprint.category;
  if (blueprint.subcategory !== undefined) row.subcategory = blueprint.subcategory;
  if (blueprint.size !== undefined) row.size = blueprint.size;
  if (blueprint.timePeriod !== undefined) row.time_period = blueprint.timePeriod;
  if (blueprint.description !== undefined) row.description = blueprint.description;
  if (blueprint.author !== undefined) row.author = blueprint.author;
  if (blueprint.authorId !== undefined) row.author_id = blueprint.authorId;
  if (blueprint.color) {
    row.color_primary = blueprint.color.primary;
    row.color_secondary = blueprint.color.secondary;
    row.color_accent = blueprint.color.accent;
  }
  if (blueprint.isSystem !== undefined) row.is_system = blueprint.isSystem;
  if (blueprint.isFeatured !== undefined) row.is_featured = blueprint.isFeatured;
  if (blueprint.usageCount !== undefined) row.usage_count = blueprint.usageCount;
  if (blueprint.cloneCount !== undefined) row.clone_count = blueprint.cloneCount;
  if (blueprint.sourceListId !== undefined) row.source_list_id = blueprint.sourceListId;

  return row;
}

// Request types for API
export interface CreateBlueprintRequest {
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  timePeriod?: 'all-time' | 'decade' | 'year';
  description?: string;
  color?: BlueprintColor;
  sourceListId?: string;
}

export interface UpdateBlueprintRequest {
  title?: string;
  category?: string;
  subcategory?: string;
  size?: number;
  timePeriod?: 'all-time' | 'decade' | 'year';
  description?: string;
  color?: BlueprintColor;
  isFeatured?: boolean;
}

// Response type for sharing
export interface BlueprintShareResponse {
  blueprint: Blueprint;
  shareUrl: string;
  shortUrl?: string;
}

// Search/filter parameters
export interface SearchBlueprintsParams {
  category?: string;
  subcategory?: string;
  authorId?: string;
  isFeatured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: 'popular' | 'recent' | 'trending';
}

// Generate a URL-friendly slug from title
export function generateBlueprintSlug(title: string, id?: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);

  // Append short ID for uniqueness
  if (id) {
    const shortId = id.slice(0, 8);
    return `${baseSlug}-${shortId}`;
  }

  return baseSlug;
}

// Convert legacy showcase data to Blueprint format
export interface LegacyShowcaseItem {
  id: number;
  category: string;
  subcategory?: string;
  title: string;
  author: string;
  comment: string;
  color: BlueprintColor;
  timePeriod: 'all-time' | 'decade' | 'year';
  hierarchy: string;
  position: { x: number; y: number };
  rotation: number;
  scale: number;
  isBanned?: boolean;
}

export function legacyShowcaseToBlueprint(item: LegacyShowcaseItem): Blueprint {
  // Parse hierarchy like "Top 50" to get size
  const sizeMatch = item.hierarchy.match(/\d+/);
  const size = sizeMatch ? parseInt(sizeMatch[0], 10) : 50;

  return {
    id: `system-showcase-${item.id}`,
    slug: generateBlueprintSlug(item.title, `system-${item.id}`),
    title: item.title,
    category: item.category,
    subcategory: item.subcategory,
    size,
    timePeriod: item.timePeriod,
    description: item.comment,
    author: item.author,
    color: item.color,
    displayPosition: item.position,
    rotation: item.rotation,
    scale: item.scale,
    isSystem: true,
    isFeatured: true,
    isBanned: item.isBanned,
    usageCount: 0,
    cloneCount: 0,
  };
}
