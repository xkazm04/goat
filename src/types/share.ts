// Share System Types

export interface SharedRanking {
  id: string;
  list_id: string;
  user_id?: string;
  title: string;
  category: string;
  subcategory?: string;
  time_period?: string;
  items: SharedRankingItem[];
  share_code: string;
  og_image_url?: string;
  view_count: number;
  challenge_count: number;
  created_at: string;
  updated_at: string;
}

export interface SharedRankingItem {
  position: number;
  title: string;
  description?: string;
  image_url?: string;
}

export interface CreateSharedRankingRequest {
  list_id: string;
  user_id?: string;
  title: string;
  category: string;
  subcategory?: string;
  time_period?: string;
  items: SharedRankingItem[];
}

export interface ShareConfig {
  title: string;
  category: string;
  subcategory?: string;
  itemCount: number;
  timePeriod?: string;
  shareUrl?: string;
  ogImageUrl?: string;
  shareCode?: string;
}

export interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  hoverColor: string;
  generateUrl: (config: ShareConfig) => string;
}

export interface ChallengeRankingRequest {
  original_share_id: string;
  user_id?: string;
}

export interface OGImageData {
  title: string;
  category: string;
  subcategory?: string;
  timePeriod?: string;
  items: Array<{
    position: number;
    title: string;
    image_url?: string;
  }>;
  username?: string;
  style?: 'default' | 'minimal' | 'vibrant';
}
