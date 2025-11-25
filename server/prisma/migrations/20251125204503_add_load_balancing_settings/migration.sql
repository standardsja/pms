-- CreateTable
CREATE TABLE `LoadBalancingSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `strategy` VARCHAR(191) NOT NULL DEFAULT 'LEAST_LOADED',
    `autoAssignOnApproval` BOOLEAN NOT NULL DEFAULT true,
    `lastRoundRobinIndex` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
