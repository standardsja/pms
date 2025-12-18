/*
  Warnings:

  - You are about to drop the `LdapSyncStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoleChangeAudit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `RoleChangeAudit` DROP FOREIGN KEY `RoleChangeAudit_performedById_fkey`;

-- DropForeignKey
ALTER TABLE `RoleChangeAudit` DROP FOREIGN KEY `RoleChangeAudit_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `RoleChangeAudit` DROP FOREIGN KEY `RoleChangeAudit_userId_fkey`;

-- DropForeignKey
ALTER TABLE `RoleChangeAudit` DROP FOREIGN KEY `RoleChangeAudit_userRoleId_fkey`;

-- DropIndex
DROP INDEX `UserRole_deletedAt_idx` ON `UserRole`;

-- AlterTable
ALTER TABLE `UserRole` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- DropTable
DROP TABLE `LdapSyncStatus`;

-- DropTable
DROP TABLE `RoleChangeAudit`;
