import { apiClient } from './client';

export interface ItemResearchRequest {
  name: string;
  category: string;
  subcategory: string;
  user_provided_description?: string;
  auto_create?: boolean;
  allow_duplicate?: boolean;
  research_depth?: 'quick' | 'standard' | 'comprehensive';
  duplicate_action?: 'reject' | 'allow' | 'merge';
}

export interface DuplicateInfo {
  is_duplicate: boolean;
  duplicate_count: number;
  existing_items: any[];
  similarity_scores: number[];
  exact_match: boolean;
}

export interface ItemResearchResponse {
  name: string;
  category: string;
  subcategory: string;
  is_valid: boolean;
  validation_errors: string[];
  duplicate_info: DuplicateInfo;
  description?: string;
  group?: string;
  item_year?: number;
  item_year_to?: number;
  reference_url?: string;
  image_url?: string;
  research_performed: boolean;
  llm_confidence: number;
  web_sources_found: number;
  research_method: string;
  research_errors: string[];
  item_created: boolean;
  item_id?: string;
}

export interface ItemValidationRequest {
  name: string;
  category: string;
  subcategory: string;
  check_duplicates?: boolean;
}

const RESEARCH_ENDPOINT = '/top/research';

export const itemResearchApi = {
  // Research item with metadata gathering
  researchItem: async (request: ItemResearchRequest): Promise<ItemResearchResponse> => {
    return apiClient.post<ItemResearchResponse>(RESEARCH_ENDPOINT, request);
  },

  // Quick validation without research
  validateItem: async (request: ItemValidationRequest): Promise<ItemResearchResponse> => {
    return apiClient.post<ItemResearchResponse>(`${RESEARCH_ENDPOINT}/validate`, request);
  },
};