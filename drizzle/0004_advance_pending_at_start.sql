-- Migration: add advance_pending_at_start to past_season_data

ALTER TABLE past_season_data
  ADD COLUMN IF NOT EXISTS advance_pending_at_start DECIMAL(12, 2);
