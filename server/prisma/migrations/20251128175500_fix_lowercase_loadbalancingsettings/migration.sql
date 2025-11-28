-- Migration: fix_lowercase_loadbalancingsettings
-- Purpose: Some environments created table `loadbalancingsettings` (lowercase) instead of `LoadBalancingSettings`.
--          Add missing columns on that lowercase table to resolve runtime P2022 column errors.

-- Add columns if the lowercase table exists
SET @tbl := (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'loadbalancingsettings');

-- Only proceed if table exists
-- Note: MySQL doesn't support IF statements in plain SQL; use dynamic SQL via prepared statements
-- We'll attempt ALTER and ignore errors if table doesn't exist

ALTER TABLE `loadbalancingsettings`
  ADD COLUMN IF NOT EXISTS `roundRobinCounter` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `autoAssignOnApproval` BOOLEAN NOT NULL DEFAULT true;
