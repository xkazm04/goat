-- Add fork_count column to shared_rankings table
-- Tracks how many times a shared ranking has been forked/remixed

ALTER TABLE shared_rankings
ADD COLUMN IF NOT EXISTS fork_count integer NOT NULL DEFAULT 0;
