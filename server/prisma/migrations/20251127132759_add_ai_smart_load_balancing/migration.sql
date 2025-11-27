-- AlterTable
ALTER TABLE `loadbalancingsettings` ADD COLUMN `aiEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `learningEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `minConfidenceScore` DOUBLE NOT NULL DEFAULT 0.6,
    ADD COLUMN `performanceWeighting` DOUBLE NOT NULL DEFAULT 1.5,
    ADD COLUMN `priorityWeighting` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `specialtyWeighting` DOUBLE NOT NULL DEFAULT 1.3,
    ADD COLUMN `workloadWeighting` DOUBLE NOT NULL DEFAULT 1.2,
    MODIFY `strategy` VARCHAR(191) NOT NULL DEFAULT 'AI_SMART';

-- CreateTable
CREATE TABLE `OfficerPerformanceMetrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `officerId` INTEGER NOT NULL,
    `totalAssignments` INTEGER NOT NULL DEFAULT 0,
    `completedAssignments` INTEGER NOT NULL DEFAULT 0,
    `averageCompletionTime` DOUBLE NOT NULL DEFAULT 0,
    `successRate` DOUBLE NOT NULL DEFAULT 1.0,
    `currentWorkload` INTEGER NOT NULL DEFAULT 0,
    `categoryExpertise` JSON NOT NULL,
    `averageResponseTime` DOUBLE NOT NULL DEFAULT 0,
    `qualityScore` DOUBLE NOT NULL DEFAULT 0.8,
    `efficiencyScore` DOUBLE NOT NULL DEFAULT 0.8,
    `complexityHandling` DOUBLE NOT NULL DEFAULT 0.5,
    `peakPerformanceHours` JSON NOT NULL,
    `lastAssignedAt` DATETIME(3) NULL,
    `lastPerformanceUpdate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OfficerPerformanceMetrics_officerId_idx`(`officerId`),
    UNIQUE INDEX `OfficerPerformanceMetrics_officerId_key`(`officerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestAssignmentLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `officerId` INTEGER NOT NULL,
    `strategy` VARCHAR(191) NOT NULL,
    `confidenceScore` DOUBLE NOT NULL DEFAULT 0.7,
    `predictedCompletionTime` DOUBLE NULL,
    `actualCompletionTime` DOUBLE NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `wasSuccessful` BOOLEAN NULL,
    `feedbackScore` DOUBLE NULL,
    `reassignmentCount` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,

    INDEX `RequestAssignmentLog_requestId_idx`(`requestId`),
    INDEX `RequestAssignmentLog_officerId_idx`(`officerId`),
    INDEX `RequestAssignmentLog_assignedAt_idx`(`assignedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OfficerPerformanceMetrics` ADD CONSTRAINT `OfficerPerformanceMetrics_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestAssignmentLog` ADD CONSTRAINT `RequestAssignmentLog_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestAssignmentLog` ADD CONSTRAINT `RequestAssignmentLog_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
