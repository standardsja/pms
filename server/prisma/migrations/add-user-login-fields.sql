-- Non-destructive SQL to add login/account state fields to `User` table
-- Apply this on your MySQL server for production to avoid running prisma migrate when migration history is out of sync.

ALTER TABLE `User`
  ADD COLUMN `failedLogins` INT DEFAULT 0,
  ADD COLUMN `lastFailedLogin` DATETIME NULL,
  ADD COLUMN `lastLogin` DATETIME NULL,
  ADD COLUMN `blocked` TINYINT(1) DEFAULT 0,
  ADD COLUMN `blockedAt` DATETIME NULL,
  ADD COLUMN `blockedReason` TEXT NULL;

-- Optional: add index on lastFailedLogin for monitoring/queries
CREATE INDEX IF NOT EXISTS idx_user_lastFailedLogin ON `User` (`lastFailedLogin`);
CREATE INDEX IF NOT EXISTS idx_user_lastLogin ON `User` (`lastLogin`);
