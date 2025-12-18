-- AlterTable
ALTER TABLE `UserRole` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `RoleChangeAudit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userRoleId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `performedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoleChangeAudit_userId_idx`(`userId`),
    INDEX `RoleChangeAudit_action_idx`(`action`),
    INDEX `RoleChangeAudit_source_idx`(`source`),
    INDEX `RoleChangeAudit_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LdapSyncStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lastSyncAt` DATETIME(3) NULL,
    `nextSyncAt` DATETIME(3) NULL,
    `usersProcessed` INTEGER NOT NULL DEFAULT 0,
    `usersCreated` INTEGER NOT NULL DEFAULT 0,
    `usersUpdated` INTEGER NOT NULL DEFAULT 0,
    `rolesAssigned` INTEGER NOT NULL DEFAULT 0,
    `rolesRemoved` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL,
    `errorMessage` TEXT NULL,
    `duration` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LdapSyncStatus_status_idx`(`status`),
    INDEX `LdapSyncStatus_lastSyncAt_idx`(`lastSyncAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `UserRole_deletedAt_idx` ON `UserRole`(`deletedAt`);

-- AddForeignKey
ALTER TABLE `RoleChangeAudit` ADD CONSTRAINT `RoleChangeAudit_userRoleId_fkey` FOREIGN KEY (`userRoleId`) REFERENCES `UserRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoleChangeAudit` ADD CONSTRAINT `RoleChangeAudit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoleChangeAudit` ADD CONSTRAINT `RoleChangeAudit_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoleChangeAudit` ADD CONSTRAINT `RoleChangeAudit_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
