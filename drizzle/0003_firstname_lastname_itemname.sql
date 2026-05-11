-- Migration: add first_name, last_name to users; widen item_name in prioritizing_game

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name  VARCHAR(100) NOT NULL DEFAULT '',
  ALTER COLUMN name TYPE VARCHAR(200);

-- Backfill first_name / last_name from existing name column
UPDATE users
SET
  first_name = SPLIT_PART(name, ' ', 1),
  last_name  = TRIM(SUBSTRING(name FROM POSITION(' ' IN name)));

-- Widen itemName for custom user-typed categories
ALTER TABLE prioritizing_game
  ALTER COLUMN item_name TYPE VARCHAR(255);
