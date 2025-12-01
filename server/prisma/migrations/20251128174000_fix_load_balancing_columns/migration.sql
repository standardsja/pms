-- Migration: fix_load_balancing_columns
-- Purpose: Ensure required columns exist on LoadBalancingSettings in production DB
-- Context: Frontend error indicates `roundRobinCounter` is missing. We add it (and
--          safeguard `autoAssignOnApproval`) using IF NOT EXISTS to avoid failures.

-- Add missing columns if they do not exist
ALTER TABLE `LoadBalancingSettings`
  ADD COLUMN IF NOT EXISTS `roundRobinCounter` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `autoAssignOnApproval` BOOLEAN NOT NULL DEFAULT true;
