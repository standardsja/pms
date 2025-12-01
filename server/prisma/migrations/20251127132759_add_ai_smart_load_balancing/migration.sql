-- Migration: add_ai_smart_load_balancing
-- Introduces officer performance metrics and assignment log tables for advanced / AI-driven load balancing.
-- Existing production tables may already exist; CREATE IF NOT EXISTS guards avoid duplication errors.

-- CreateTable OfficerPerformanceMetrics
CREATE TABLE IF NOT EXISTS `OfficerPerformanceMetrics` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `officerId` INTEGER NOT NULL,
  `activeAssignments` INTEGER NOT NULL DEFAULT 0,
  `completedAssignments` INTEGER NOT NULL DEFAULT 0,
  `averageTurnaroundMinutes` INTEGER NULL,
  `lastAssignmentAt` DATETIME(3) NULL,
  `loadScore` DOUBLE NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `OfficerPerformanceMetrics_officerId_idx`(`officerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ForeignKey
ALTER TABLE `OfficerPerformanceMetrics` ADD CONSTRAINT `OfficerPerformanceMetrics_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable RequestAssignmentLog
CREATE TABLE IF NOT EXISTS `RequestAssignmentLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `requestId` INTEGER NOT NULL,
  `officerId` INTEGER NOT NULL,
  `strategy` ENUM('LEAST_LOADED','ROUND_ROBIN','RANDOM') NULL,
  `previousOfficerId` INTEGER NULL,
  `notes` VARCHAR(191) NULL,
  `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `RequestAssignmentLog_requestId_idx`(`requestId`),
  INDEX `RequestAssignmentLog_officerId_idx`(`officerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ForeignKeys
ALTER TABLE `RequestAssignmentLog` ADD CONSTRAINT `RequestAssignmentLog_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RequestAssignmentLog` ADD CONSTRAINT `RequestAssignmentLog_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
