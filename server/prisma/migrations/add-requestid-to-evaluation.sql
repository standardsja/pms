-- Add nullable requestId column to Evaluation and an index
-- Safe, non-destructive migration: adds a nullable INT column and index only
-- Backup your database before running in production

ALTER TABLE `Evaluation` ADD COLUMN `requestId` INT NULL;
CREATE INDEX `idx_evaluation_requestId` ON `Evaluation` (`requestId`);

-- Optional: add foreign key constraint if you have referential integrity and all request ids are valid
-- Uncomment and run after verifying existing data consistency
-- ALTER TABLE `Evaluation` ADD CONSTRAINT `fk_evaluation_request_requestId` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`);

-- End of migration
