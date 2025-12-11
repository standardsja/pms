-- Idempotent addition for Evaluation.requestId
-- Adds `requestId` only if it does not already exist
SET @tbl := 'Evaluation';
SET @col := 'requestId';
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql := IF(@c = 0, CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT NULL;'), 'SELECT "exists";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add index on requestId if not exists
SET @idx := 'idx_evaluation_requestId';
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND INDEX_NAME = @idx;
SET @sql := IF(@c = 0, CONCAT('CREATE INDEX `', @idx, '` ON `', @tbl, '` (`requestId`);'), 'SELECT "index_exists";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
