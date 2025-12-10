-- CreateTable
CREATE TABLE `SplinteringRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ruleId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `thresholdAmount` DECIMAL(12, 2) NOT NULL,
    `timeWindowDays` INTEGER NOT NULL DEFAULT 90,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SplinteringRule_ruleId_key`(`ruleId`),
    INDEX `SplinteringRule_enabled_idx`(`enabled`),
    INDEX `SplinteringRule_ruleId_idx`(`ruleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
