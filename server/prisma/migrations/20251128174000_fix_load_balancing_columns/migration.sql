-- Migration: fix_load_balancing_columns
-- Purpose: Ensure required columns exist on LoadBalancingSettings in production DB
-- Context: Frontend error indicates `roundRobinCounter` is missing. We add it (and
--          safeguard `autoAssignOnApproval`) using a compatible approach for all MySQL versions.

-- Add roundRobinCounter column if it doesn't exist (safe for all MySQL versions)
SET @dbname = DATABASE();
SET @tablename = "LoadBalancingSettings";
SET @columnname = "roundRobinCounter";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INTEGER NOT NULL DEFAULT 0")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add autoAssignOnApproval column if it doesn't exist
SET @columnname = "autoAssignOnApproval";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BOOLEAN NOT NULL DEFAULT true")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

