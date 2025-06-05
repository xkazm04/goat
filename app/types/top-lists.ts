export enum CategoryEnum {
  MUSIC = "music",
  SPORTS = "sports", 
  GAMES = "games"
}

export interface ListItem {
  id: string;
  name: string;
  category: CategoryEnum;
  subcategory?: string;
  accolades?: string;
  reference_url?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ListItemWithDetails {
  id: string;
  ranking: number;
  item: ListItem;
  created_at: string;
  updated_at: string;
}

export interface TopList {
  id: string;
  title: string;
  category: CategoryEnum;
  subcategory?: string;
  user_id?: string;
  predefined: boolean;
  size: number;
  time_period: string;
  parent_list_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ListWithItems extends TopList {
  items: ListItemWithDetails[];
  total_items: number;
}

export interface ListAnalytics {
  list_id: string;
  total_votes: number;
  total_comments: number;
  follower_count: number;
  engagement_rate: number;
  average_item_ranking: number;
  most_controversial_item_id?: string;
  version_count: number;
}

// Request/Response types
export interface CreateListRequest {
  title: string;
  category: CategoryEnum | string; // Allow string for flexibility
  subcategory?: string;
  user_id: string; // Required for new endpoint
  predefined?: boolean;
  size?: number;
  time_period?: string;
  parent_list_id?: string;
}

export interface UpdateListRequest {
  title?: string;
  category?: CategoryEnum;
  subcategory?: string;
  size?: number;
  time_period?: string;
}

export interface CloneListRequest {
  title?: string;
  category?: CategoryEnum;
  subcategory?: string;
  size?: number;
  time_period?: string;
  copy_items?: boolean;
}

export interface SearchListsParams {
  user_id?: string;
  category?: CategoryEnum;
  subcategory?: string;
  predefined?: boolean;
  limit?: number;
  offset?: number;
}

export interface VersionComparison {
  version_1: number;
  version_2: number;
  added_items: string[];
  removed_items: string[];
  ranking_changes: Record<string, { old_rank: number; new_rank: number }>;
  total_changes: number;
}


export interface ListCreationResponse {
  list: {
    id: string;
    title: string;
    category: string;
    subcategory?: string;
    user_id: string;
    predefined: boolean;
    size: number;
    time_period: string;
    parent_list_id?: string;
    created_at: string;
    updated_at: string;
    is_temporary_user?: boolean; // Additional field from backend
  };
  user: {
    id: string;
    is_temporary: boolean;
    display_name?: string;
    email?: string;
    username?: string;
    created_at: string;
    updated_at: string;
  };
  is_new_user: boolean;
  success: boolean;
}
