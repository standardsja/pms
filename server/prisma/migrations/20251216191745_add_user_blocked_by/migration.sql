-- DropForeignKey
ALTER TABLE `OfficerPerformanceMetrics` DROP FOREIGN KEY `OfficerPerformanceMetrics_officerId_fkey`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `blockedBy` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `OfficerPerformanceMetrics` ADD CONSTRAINT `OfficerPerformanceMetrics_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
