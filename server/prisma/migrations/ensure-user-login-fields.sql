-- Idempotent additions for User login/account fields
-- Adds columns only if they do not already exist in the current database

-- lastLogin
SET @tbl := 'User';
SET @col := 'lastLogin';
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql := IF(@c = 0, CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` DATETIME NULL;'), 'SELECT "exists";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- failedLogins
SET @col := 'failedLogins';
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql := IF(@c = 0, CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` INT DEFAULT 0;'), 'SELECT "exists";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- lastFailedLogin
SET @col := 'lastFailedLogin';
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql := IF(@c = 0, CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` DATETIME NULL;'), 'SELECT "exists";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- blocked
SET @col := 'blocked';
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql := IF(@c = 0, CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` BOOLEAN DEFAULT FALSE;'), 'SELECT "exists";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- blockedAt
SET @col := 'blockedAt';
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql := IF(@c = 0, CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` DATETIME NULL;'), 'SELECT "exists";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- blockedReason
SET @col := 'blockedReason';
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql := IF(@c = 0, CONCAT('ALTER TABLE `', @tbl, '` ADD COLUMN `', @col, '` VARCHAR(255) NULL;'), 'SELECT "exists";');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
