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
}

export interface UpdateListRequest {
  title?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  size?: number;
  time_period?: string;
}

export interface CreateListWithUserRequest {
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  time_period?: string;
  description?: string;
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