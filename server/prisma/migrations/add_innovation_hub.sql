-- Innovation Hub Tables Migration
-- This adds the Idea, Vote, IdeaComment, and IdeaAttachment tables

-- Create Idea status enum (if not exists)
-- CREATE TYPE "IdeaStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PROMOTED_TO_PROJECT');
-- CREATE TYPE "IdeaCategory" AS ENUM ('PROCESS_IMPROVEMENT', 'TECHNOLOGY', 'CUSTOMER_SERVICE', 'SUSTAINABILITY', 'COST_REDUCTION', 'PRODUCT_INNOVATION', 'OTHER');

-- Create Idea table
CREATE TABLE IF NOT EXISTS `idea` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('PROCESS_IMPROVEMENT', 'TECHNOLOGY', 'CUSTOMER_SERVICE', 'SUSTAINABILITY', 'COST_REDUCTION', 'PRODUCT_INNOVATION', 'OTHER') NOT NULL,
  `status` ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PROMOTED_TO_PROJECT') NOT NULL DEFAULT 'DRAFT',
  `submittedBy` INT NOT NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedBy` INT NULL,
  `reviewedAt` DATETIME(3) NULL,
  `reviewNotes` TEXT NULL,
  `promotedAt` DATETIME(3) NULL,
  `projectCode` VARCHAR(191) NULL,
  `voteCount` INT NOT NULL DEFAULT 0,
  `viewCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idea_projectCode_key` (`projectCode`),
  INDEX `idea_status_idx` (`status`),
  INDEX `idea_category_idx` (`category`),
  INDEX `idea_submittedBy_idx` (`submittedBy`),
  INDEX `idea_createdAt_idx` (`createdAt`),
  INDEX `idea_voteCount_idx` (`voteCount`),
  CONSTRAINT `idea_submittedBy_fkey` FOREIGN KEY (`submittedBy`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create Vote table
CREATE TABLE IF NOT EXISTS `vote` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ideaId` INT NOT NULL,
  `userId` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `vote_ideaId_userId_key` (`ideaId`, `userId`),
  INDEX `vote_ideaId_idx` (`ideaId`),
  INDEX `vote_userId_idx` (`userId`),
  CONSTRAINT `vote_ideaId_fkey` FOREIGN KEY (`ideaId`) REFERENCES `idea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `vote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create IdeaComment table
CREATE TABLE IF NOT EXISTS `ideacomment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ideaId` INT NOT NULL,
  `userId` INT NOT NULL,
  `text` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ideacomment_ideaId_idx` (`ideaId`),
  INDEX `ideacomment_userId_idx` (`userId`),
  CONSTRAINT `ideacomment_ideaId_fkey` FOREIGN KEY (`ideaId`) REFERENCES `idea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ideacomment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create IdeaAttachment table
CREATE TABLE IF NOT EXISTS `ideaattachment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ideaId` INT NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileUrl` VARCHAR(191) NOT NULL,
  `fileSize` INT NOT NULL,
  `mimeType` VARCHAR(191) NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ideaattachment_ideaId_idx` (`ideaId`),
  CONSTRAINT `ideaattachment_ideaId_fkey` FOREIGN KEY (`ideaId`) REFERENCES `idea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
