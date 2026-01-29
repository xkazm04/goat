/**
 * Criteria API Client
 * Functions for interacting with criteria-related API endpoints
 */

import type {
  ListCriteriaConfig,
  ListItemCriteriaScores,
  CriterionScore,
} from '@/lib/criteria/types';

const API_BASE = '/api';

/**
 * Fetch criteria configuration for a list
 */
export async function fetchListCriteria(listId: string): Promise<{
  listId: string;
  criteriaConfig: ListCriteriaConfig | null;
}> {
  const response = await fetch(`${API_BASE}/lists/${listId}/criteria`);
  if (!response.ok) {
    throw new Error(`Failed to fetch criteria: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}

/**
 * Save criteria configuration for a list
 */
export async function saveListCriteria(
  listId: string,
  criteriaConfig: ListCriteriaConfig | null
): Promise<{ listId: string; criteriaConfig: ListCriteriaConfig | null }> {
  const response = await fetch(`${API_BASE}/lists/${listId}/criteria`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ criteriaConfig }),
  });
  if (!response.ok) {
    throw new Error(`Failed to save criteria: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}

/**
 * Fetch all item scores for a list
 */
export async function fetchListItemScores(listId: string): Promise<{
  items: Array<{
    id: string;
    itemId: string;
    criteriaScores: ListItemCriteriaScores | null;
  }>;
}> {
  const response = await fetch(
    `${API_BASE}/lists/${listId}/items?include_scores=true`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch item scores: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}

/**
 * Fetch scores for a specific item
 */
export async function fetchItemScores(
  listId: string,
  itemId: string
): Promise<{ listItemId: string; criteriaScores: ListItemCriteriaScores | null }> {
  const response = await fetch(
    `${API_BASE}/lists/${listId}/items/${itemId}/scores`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch item scores: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}

/**
 * Save scores for a specific item
 */
export async function saveItemScores(
  listId: string,
  itemId: string,
  scores: CriterionScore[],
  profileId: string,
  justification?: string
): Promise<{ listItemId: string; criteriaScores: ListItemCriteriaScores }> {
  const response = await fetch(
    `${API_BASE}/lists/${listId}/items/${itemId}/scores`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores, profileId, justification }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to save item scores: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}

/**
 * Batch save scores for multiple items
 */
export async function batchSaveItemScores(
  listId: string,
  items: Array<{ itemId: string; criteriaScores: ListItemCriteriaScores }>
): Promise<{ updated: number }> {
  const response = await fetch(`${API_BASE}/lists/${listId}/items`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    throw new Error(`Failed to batch save scores: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}
