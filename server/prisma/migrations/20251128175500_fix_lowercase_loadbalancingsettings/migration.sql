-- Migration: fix_lowercase_loadbalancingsettings
-- Purpose: Some environments created table `loadbalancingsettings` (lowercase) instead of `LoadBalancingSettings`.
--          Add missing columns on that lowercase table to resolve runtime P2022 column errors.

-- Add columns if the lowercase table exists using compatible MySQL syntax
SET @dbname = DATABASE();
SET @tablename = "loadbalancingsettings";

-- Check if the lowercase table exists and add roundRobinCounter if needed
SET @columnname = "roundRobinCounter";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE table_name = @tablename AND table_schema = @dbname
  ) > 0 AND (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname
  ) = 0,
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INTEGER NOT NULL DEFAULT 0"),
  "SELECT 1"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add autoAssignOnApproval if the lowercase table exists and column doesn't
SET @columnname = "autoAssignOnApproval";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE table_name = @tablename AND table_schema = @dbname
  ) > 0 AND (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname
  ) = 0,
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BOOLEAN NOT NULL DEFAULT true"),
  "SELECT 1"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

