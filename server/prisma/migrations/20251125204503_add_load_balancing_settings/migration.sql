-- Migration: add_load_balancing_settings
-- This migration recreates the originally applied table for load balancing configuration.
-- Tables may already exist in the target database; guards (IF NOT EXISTS) prevent errors.

-- CreateTable
CREATE TABLE IF NOT EXISTS `LoadBalancingSettings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `strategy` ENUM('LEAST_LOADED','ROUND_ROBIN','RANDOM') NOT NULL DEFAULT 'LEAST_LOADED',
  `autoAssignOnApproval` BOOLEAN NOT NULL DEFAULT true,
  `roundRobinCounter` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  `updatedBy` INTEGER NULL,
  PRIMARY KEY (`id`),
  INDEX `LoadBalancingSettings_updatedBy_idx`(`updatedBy`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey (conditionally)
ALTER TABLE `LoadBalancingSettings` ADD CONSTRAINT `LoadBalancingSettings_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
