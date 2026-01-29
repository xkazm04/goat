-- Migration: Add criteria columns to lists and list_items tables
-- Purpose: Enable criteria-based scoring and ranking persistence
-- Part of: Phase 9 - Schema & API for Criteria System

-- =============================================================================
-- ADD CRITERIA_CONFIG COLUMN TO LISTS TABLE
-- =============================================================================

-- Add criteria_config JSONB column to lists table
-- Stores the criteria profile configuration for a list
-- Structure: {profileId, profileName, criteria: [{id, name, description, weight, minScore, maxScore, icon?, color?}], createdAt, updatedAt}
ALTER TABLE lists ADD COLUMN IF NOT EXISTS criteria_config JSONB DEFAULT NULL;

-- Add CHECK constraint enforcing max 8 criteria per list
-- This ensures reasonable limits and consistent UI rendering
ALTER TABLE lists ADD CONSTRAINT lists_criteria_config_max_8
  CHECK (
    criteria_config IS NULL
    OR jsonb_array_length(criteria_config->'criteria') <= 8
  );

-- Create GIN index with jsonb_path_ops for efficient containment queries
-- jsonb_path_ops is smaller and faster than default for @> and @? operators
CREATE INDEX IF NOT EXISTS idx_lists_criteria_gin
  ON lists USING GIN (criteria_config jsonb_path_ops);

COMMENT ON COLUMN lists.criteria_config IS
  'JSONB: Criteria profile configuration for this list. Structure: {profileId: string, profileName: string, criteria: Criterion[], createdAt: ISO timestamp, updatedAt: ISO timestamp}. Max 8 criteria enforced by CHECK constraint.';

-- =============================================================================
-- ADD CRITERIA_SCORES COLUMN TO LIST_ITEMS TABLE
-- =============================================================================

-- Add criteria_scores JSONB column to list_items table
-- Stores all criteria scores for a single item in a list
-- Structure: {profileId, scores: [{criterionId, score, note?}], weightedScore, justification?, scoredAt}
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS criteria_scores JSONB DEFAULT NULL;

-- Create GIN index with jsonb_path_ops for efficient containment queries
CREATE INDEX IF NOT EXISTS idx_list_items_scores_gin
  ON list_items USING GIN (criteria_scores jsonb_path_ops);

-- Create B-tree expression index for weighted score range queries
-- Enables efficient ORDER BY and WHERE clauses on weightedScore
CREATE INDEX IF NOT EXISTS idx_list_items_weighted_score
  ON list_items ((criteria_scores->>'weightedScore')::numeric)
  WHERE criteria_scores IS NOT NULL;

COMMENT ON COLUMN list_items.criteria_scores IS
  'JSONB: Criteria scores for this item. Structure: {profileId: string, scores: CriterionScore[], weightedScore: number, justification?: string, scoredAt: ISO timestamp}. Indexed for efficient range queries on weightedScore.';

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- RLS Policies: NOT added here because lists and list_items tables already have
-- RLS policies configured. JSONB columns automatically inherit the table's
-- existing row-level security policies.
--
-- JSONB Structure Reference:
--
-- lists.criteria_config:
-- {
--   "profileId": "uuid",
--   "profileName": "string",
--   "criteria": [
--     {
--       "id": "uuid",
--       "name": "string",
--       "description": "string",
--       "weight": 0-100,
--       "minScore": number,
--       "maxScore": number,
--       "icon": "string (optional)",
--       "color": "string (optional)"
--     }
--   ],
--   "createdAt": "ISO 8601 timestamp",
--   "updatedAt": "ISO 8601 timestamp"
-- }
--
-- list_items.criteria_scores:
-- {
--   "profileId": "uuid",
--   "scores": [
--     {
--       "criterionId": "uuid",
--       "score": number,
--       "note": "string (optional)"
--     }
--   ],
--   "weightedScore": number,
--   "justification": "string (optional)",
--   "scoredAt": "ISO 8601 timestamp"
-- }
