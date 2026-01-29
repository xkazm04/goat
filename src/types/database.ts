/**
 * Database Types for Supabase
 *
 * This file contains TypeScript types that mirror the Supabase database schema.
 * These types provide compile-time safety for database operations.
 *
 * REGENERATION:
 * To regenerate these types from the live schema, run:
 * ```bash
 * npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
 * ```
 *
 * IMPORTANT: Keep these types in sync with the actual database schema.
 * If you modify the database schema, update these types accordingly.
 */

import type { ListCriteriaConfig, ListItemCriteriaScores } from '@/lib/criteria/types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Database schema type definition
 * Contains all table definitions, views, and functions
 */
export interface Database {
  public: {
    Tables: {
      /**
       * Main items table - stores all rankable items
       */
      items: {
        Row: {
          id: string;
          name: string;
          title?: string | null;
          description: string | null;
          image_url: string | null;
          category: string;
          subcategory: string | null;
          group: string | null;
          group_id: string | null;
          tags: string[] | null;
          item_year: number | null;
          item_year_to: number | null;
          reference_url: string | null;
          view_count: number | null;
          selection_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          title?: string | null;
          description?: string | null;
          image_url?: string | null;
          category: string;
          subcategory?: string | null;
          group?: string | null;
          group_id?: string | null;
          tags?: string[] | null;
          item_year?: number | null;
          item_year_to?: number | null;
          reference_url?: string | null;
          view_count?: number | null;
          selection_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          title?: string | null;
          description?: string | null;
          image_url?: string | null;
          category?: string;
          subcategory?: string | null;
          group?: string | null;
          group_id?: string | null;
          tags?: string[] | null;
          item_year?: number | null;
          item_year_to?: number | null;
          reference_url?: string | null;
          view_count?: number | null;
          selection_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'items_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'item_groups';
            referencedColumns: ['id'];
          }
        ];
      };

      /**
       * User-created lists for rankings
       */
      lists: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string;
          subcategory: string | null;
          size: number;
          time_period: string | null;
          user_id: string | null;
          is_public: boolean;
          featured: boolean;
          total_items: number | null;
          type: string | null;
          parent_list_id: string | null;
          predefined: boolean;
          criteria_config: ListCriteriaConfig | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category: string;
          subcategory?: string | null;
          size?: number;
          time_period?: string | null;
          user_id?: string | null;
          is_public?: boolean;
          featured?: boolean;
          total_items?: number | null;
          type?: string | null;
          parent_list_id?: string | null;
          predefined?: boolean;
          criteria_config?: ListCriteriaConfig | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: string;
          subcategory?: string | null;
          size?: number;
          time_period?: string | null;
          user_id?: string | null;
          is_public?: boolean;
          featured?: boolean;
          total_items?: number | null;
          type?: string | null;
          parent_list_id?: string | null;
          predefined?: boolean;
          criteria_config?: ListCriteriaConfig | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lists_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };

      /**
       * Junction table linking lists to their ranked items
       */
      list_items: {
        Row: {
          id: string;
          list_id: string;
          item_id: string;
          ranking: number;
          criteria_scores: ListItemCriteriaScores | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          item_id: string;
          ranking: number;
          criteria_scores?: ListItemCriteriaScores | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string;
          item_id?: string;
          ranking?: number;
          criteria_scores?: ListItemCriteriaScores | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'list_items_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'lists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'list_items_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          }
        ];
      };

      /**
       * Item groups for organizing items by collection
       */
      item_groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          subcategory: string | null;
          image_url: string | null;
          item_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: string;
          subcategory?: string | null;
          image_url?: string | null;
          item_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          subcategory?: string | null;
          image_url?: string | null;
          item_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      /**
       * Blueprint templates for lists
       */
      blueprints: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          category: string;
          subcategory: string | null;
          size: number;
          time_period: string | null;
          image_url: string | null;
          group_ids: string[] | null;
          is_featured: boolean;
          clone_count: number;
          color_primary: string | null;
          color_secondary: string | null;
          color_accent: string | null;
          is_system: boolean;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          category: string;
          subcategory?: string | null;
          size?: number;
          time_period?: string | null;
          image_url?: string | null;
          group_ids?: string[] | null;
          is_featured?: boolean;
          clone_count?: number;
          color_primary?: string | null;
          color_secondary?: string | null;
          color_accent?: string | null;
          is_system?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          category?: string;
          subcategory?: string | null;
          size?: number;
          time_period?: string | null;
          image_url?: string | null;
          group_ids?: string[] | null;
          is_featured?: boolean;
          clone_count?: number;
          color_primary?: string | null;
          color_secondary?: string | null;
          color_accent?: string | null;
          is_system?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      /**
       * Shared ranking snapshots for social sharing
       */
      shared_rankings: {
        Row: {
          id: string;
          share_code: string;
          list_id: string | null;
          title: string;
          category: string;
          subcategory: string | null;
          items: Json;
          image_url: string | null;
          view_count: number;
          user_id: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          share_code: string;
          list_id?: string | null;
          title: string;
          category: string;
          subcategory?: string | null;
          items: Json;
          image_url?: string | null;
          view_count?: number;
          user_id?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          share_code?: string;
          list_id?: string | null;
          title?: string;
          category?: string;
          subcategory?: string | null;
          items?: Json;
          image_url?: string | null;
          view_count?: number;
          user_id?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'shared_rankings_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'lists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shared_rankings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };

      /**
       * User accounts
       */
      users: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          clerk_id: string | null;
          is_temporary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          clerk_id?: string | null;
          is_temporary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          clerk_id?: string | null;
          is_temporary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      /**
       * User profile data (Clerk integration)
       */
      user_profiles: {
        Row: {
          id: string;
          clerk_id: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_id: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_id?: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      /**
       * Achievement badges
       */
      badges: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      /**
       * Legacy top_items table (possibly a view or duplicate)
       */
      top_items: {
        Row: {
          id: string;
          name: string;
          title?: string | null;
          description: string | null;
          image_url: string | null;
          category: string;
          subcategory: string | null;
          group_id: string | null;
          tags: string[] | null;
          item_year: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          title?: string | null;
          description?: string | null;
          image_url?: string | null;
          category: string;
          subcategory?: string | null;
          group_id?: string | null;
          tags?: string[] | null;
          item_year?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          title?: string | null;
          description?: string | null;
          image_url?: string | null;
          category?: string;
          subcategory?: string | null;
          group_id?: string | null;
          tags?: string[] | null;
          item_year?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };

      /**
       * Legacy top_groups table (possibly a view or duplicate)
       */
      top_groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          subcategory: string | null;
          image_url: string | null;
          item_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: string;
          subcategory?: string | null;
          image_url?: string | null;
          item_count?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          subcategory?: string | null;
          image_url?: string | null;
          item_count?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// =============================================================================
// Convenience Type Aliases
// =============================================================================

/**
 * Table names type - useful for generic functions
 */
export type TableName = keyof Database['public']['Tables'];

/**
 * Get the Row type for a specific table
 */
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

/**
 * Get the Insert type for a specific table
 */
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];

/**
 * Get the Update type for a specific table
 */
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

// =============================================================================
// Table Row Type Aliases
// =============================================================================

/** Item row from the items table */
export type ItemRow = TableRow<'items'>;

/** List row from the lists table */
export type ListRow = TableRow<'lists'>;

/** List item row from the list_items table */
export type ListItemRow = TableRow<'list_items'>;

/** Item group row from the item_groups table */
export type ItemGroupRow = TableRow<'item_groups'>;

/** Blueprint row from the blueprints table */
export type BlueprintRow = TableRow<'blueprints'>;

/** Shared ranking row from the shared_rankings table */
export type SharedRankingRow = TableRow<'shared_rankings'>;

/** User row from the users table */
export type UserRow = TableRow<'users'>;

/** User profile row from the user_profiles table */
export type UserProfileRow = TableRow<'user_profiles'>;

/** Badge row from the badges table */
export type BadgeRow = TableRow<'badges'>;

/** Top item row (legacy table) */
export type TopItemRow = TableRow<'top_items'>;

/** Top group row (legacy table) */
export type TopGroupRow = TableRow<'top_groups'>;

// =============================================================================
// Insert Type Aliases
// =============================================================================

/** Insert type for items table */
export type ItemInsert = TableInsert<'items'>;

/** Insert type for lists table */
export type ListInsert = TableInsert<'lists'>;

/** Insert type for list_items table */
export type ListItemInsert = TableInsert<'list_items'>;

/** Insert type for item_groups table */
export type ItemGroupInsert = TableInsert<'item_groups'>;

/** Insert type for blueprints table */
export type BlueprintInsert = TableInsert<'blueprints'>;

/** Insert type for shared_rankings table */
export type SharedRankingInsert = TableInsert<'shared_rankings'>;

// =============================================================================
// Update Type Aliases
// =============================================================================

/** Update type for items table */
export type ItemUpdate = TableUpdate<'items'>;

/** Update type for lists table */
export type ListUpdate = TableUpdate<'lists'>;

/** Update type for blueprints table */
export type BlueprintUpdate = TableUpdate<'blueprints'>;

// =============================================================================
// Query Result Types
// =============================================================================

/**
 * List item with nested item data (from join query)
 */
export interface ListItemWithItem {
  ranking: number;
  item_id: string;
  items: Pick<ItemRow, 'id' | 'name' | 'description' | 'image_url' | 'category' | 'subcategory' | 'group_id' | 'item_year'> | null;
}

/**
 * Related item for item details
 * Note: title can be undefined because it's optional in the items table
 */
export interface RelatedItem {
  id: string;
  name: string;
  title?: string | null;
  image_url: string | null;
}
