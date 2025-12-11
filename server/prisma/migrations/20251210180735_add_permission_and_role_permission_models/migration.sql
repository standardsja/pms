/*
  Warnings:

  - You are about to drop the `featureflag` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `blocked` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `blockedAt` DATETIME(3) NULL,
    ADD COLUMN `blockedBy` INTEGER NULL,
    ADD COLUMN `blockedReason` TEXT NULL,
    ADD COLUMN `failedLogins` INTEGER NULL DEFAULT 0,
    ADD COLUMN `lastFailedLogin` DATETIME(3) NULL,
    ADD COLUMN `lastLogin` DATETIME(3) NULL;

-- DropTable
DROP TABLE `featureflag`;

-- CreateTable
CREATE TABLE `Permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `module` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Permission_name_key`(`name`),
    INDEX `Permission_module_idx`(`module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roleId` INTEGER NOT NULL,
    `permissionId` INTEGER NOT NULL,

    INDEX `RolePermission_roleId_idx`(`roleId`),
    INDEX `RolePermission_permissionId_idx`(`permissionId`),
    UNIQUE INDEX `RolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SplinteringAlert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NULL,
    `alertType` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `details` JSON NULL,
    `userId` INTEGER NULL,
    `wasBlocked` BOOLEAN NOT NULL DEFAULT false,
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `resolution` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SplinteringAlert_requestId_idx`(`requestId`),
    INDEX `SplinteringAlert_alertType_idx`(`alertType`),
    INDEX `SplinteringAlert_severity_idx`(`severity`),
    INDEX `SplinteringAlert_createdAt_idx`(`createdAt`),
    INDEX `SplinteringAlert_wasBlocked_idx`(`wasBlocked`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SplinteringAlert` ADD CONSTRAINT `SplinteringAlert_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
