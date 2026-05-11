-- Migration: add priority_advance_amount to advances, add planned_advance to past_season_data

ALTER TABLE advances
  ADD COLUMN IF NOT EXISTS priority_advance_amount DECIMAL(12, 2) DEFAULT 0;

ALTER TABLE past_season_data
  ADD COLUMN IF NOT EXISTS planned_advance DECIMAL(12, 2);
