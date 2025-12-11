-- Idempotent addition for User.pinnedModule
-- Adds `pinnedModule` only if it does not already exist
SET @tbl := 'User';
SET @col := 'pinnedModule';
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql := IF(@c = 0, CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` VARCHAR(255) NULL DEFAULT "procurement";'), 'SELECT "exists";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
