-- AlterTable
ALTER TABLE `LoadBalancingSettings` ADD COLUMN `aiEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lastRoundRobinIndex` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `learningEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `minConfidenceScore` DOUBLE NOT NULL DEFAULT 0.6,
    ADD COLUMN `performanceWeighting` DOUBLE NOT NULL DEFAULT 1.5,
    ADD COLUMN `priorityWeighting` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `specialtyWeighting` DOUBLE NOT NULL DEFAULT 1.3,
    ADD COLUMN `workloadWeighting` DOUBLE NOT NULL DEFAULT 1.2,
    MODIFY `strategy` ENUM('LEAST_LOADED', 'ROUND_ROBIN', 'RANDOM', 'AI_SMART', 'SKILL_BASED', 'PREDICTIVE') NOT NULL DEFAULT 'LEAST_LOADED';

-- AlterTable
ALTER TABLE `OfficerPerformanceMetrics` ADD COLUMN `averageCompletionTime` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `categoryExpertise` JSON NOT NULL,
    ADD COLUMN `complexityHandling` DOUBLE NOT NULL DEFAULT 0.5,
    ADD COLUMN `currentWorkload` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `efficiencyScore` DOUBLE NOT NULL DEFAULT 0.8,
    ADD COLUMN `lastAssignedAt` DATETIME(3) NULL,
    ADD COLUMN `peakPerformanceHours` JSON NOT NULL,
    ADD COLUMN `successRate` DOUBLE NOT NULL DEFAULT 0.8;

-- AlterTable
ALTER TABLE `RequestAssignmentLog` ADD COLUMN `actualCompletionTime` DOUBLE NULL,
    ADD COLUMN `confidenceScore` DOUBLE NULL,
    ADD COLUMN `predictedCompletionTime` DOUBLE NULL,
    MODIFY `strategy` ENUM('LEAST_LOADED', 'ROUND_ROBIN', 'RANDOM', 'AI_SMART', 'SKILL_BASED', 'PREDICTIVE') NULL;
