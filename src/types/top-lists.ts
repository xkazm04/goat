// Top Lists API Types

export interface TopList {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  user_id?: string;
  predefined?: boolean;
  size: number;
  time_period?: string;
  created_at: string;
  updated_at?: string;
  description?: string;
  items?: TopListItem[];
  type?: 'top' | 'award';
  parent_list_id?: string;
  /** When true, signed-in users can add custom items to the backlog during ranking */
  allow_custom_items?: boolean;
  // Engagement metrics
  engagementCount?: number;
  shareCount?: number;
}

export interface TopListItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  position?: number;
  created_at: string;
  updated_at?: string;
}

export interface ListWithItems extends TopList {
  items: TopListItem[];
}

export interface SearchListsParams {
  user_id?: string;
  category?: string;
  subcategory?: string;
  predefined?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: 'popular' | 'trending' | 'latest';
  type?: 'top' | 'award';
  parent_list_id?: string;
}

export interface CreateListRequest {
  title: string;
  category: string;
  subcategory?: string;
  user_id?: string;
  size: number;
  time_period?: string;
  description?: string;
  predefined?: boolean;
  type?: 'top' | 'award';
  parent_list_id?: string;
  allow_custom_items?: boolean;
}

export interface UpdateListRequest {
  title?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  size?: number;
  time_period?: string;
  type?: 'top' | 'award';
  parent_list_id?: string;
  allow_custom_items?: boolean;
}

export interface CreateListWithUserRequest {
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  time_period?: string;
  description?: string;
  type?: 'top' | 'award';
  parent_list_id?: string;
  user: {
    email: string;
    name?: string;
  };
}

export interface ListCreationResponse {
  list: TopList;
  user: {
    id: string;
    email: string;
    name?: string;
  };
  is_new_user: boolean;
}

export interface ListAnalytics {
  id: string;
  views: number;
  completions: number;
  average_completion_time?: number;
  created_at: string;
  updated_at: string;
}

/** Extended analytics for the Creator Analytics Dashboard */
export interface CreatorListAnalytics {
  list_id: string;
  title: string;
  category: string;
  size: number;
  created_at: string;
  /** Total share link views across all shared_rankings for this list */
  total_views: number;
  /** Number of shared_rankings created for this list */
  share_count: number;
  /** Number of unique users who ranked items in this list */
  unique_rankers: number;
  /** Total ranking activity events for this list */
  total_activities: number;
  /** Number of ranked items (list_items) */
  items_ranked: number;
  /** Views over time bucketed by day (last 30 days) */
  views_over_time: { date: string; views: number }[];
  /** Most interacted items by activity count */
  top_items: {
    item_id: string;
    name: string;
    image_url: string | null;
    activity_count: number;
    avg_position: number | null;
  }[];
  /** Consensus metrics */
  consensus: {
    /** How often rankers agree on positions (0-1) */
    agreement_rate: number;
    /** Items with most positional variance */
    most_controversial: {
      item_id: string;
      name: string;
      image_url: string | null;
      position_variance: number;
    }[];
  };
}

/** Aggregated analytics across all of a creator's lists */
export interface CreatorAnalyticsSummary {
  total_lists: number;
  total_views: number;
  total_shares: number;
  total_rankers: number;
  lists: CreatorListAnalytics[];
}

export interface VersionComparison {
  list_id: string;
  version1: number;
  version2: number;
  differences: {
    added: TopListItem[];
    removed: TopListItem[];
    moved: Array<{
      item: TopListItem;
      old_position: number;
      new_position: number;
    }>;
  };
  created_at: string;
}

export interface CloneListRequest {
  title?: string;
  category?: string;
  subcategory?: string;
  modifications?: {
    add_items?: string[];
    remove_items?: string[];
    change_size?: number;
  };
}

// Featured lists consolidated response - returns all 4 categories in single request
export interface FeaturedListsResponse {
  popular: TopList[];
  trending: TopList[];
  latest: TopList[];
  awards: TopList[];
}