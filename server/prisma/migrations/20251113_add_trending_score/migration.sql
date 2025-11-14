-- Add trendingScore column to Idea table for performance optimization
ALTER TABLE `Idea` ADD COLUMN `trendingScore` DOUBLE NOT NULL DEFAULT 0;

-- Add index for trending sort performance
CREATE INDEX `Idea_trendingScore_idx` ON `Idea`(`trendingScore`);
