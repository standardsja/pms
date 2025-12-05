-- Comprehensive Audit Trail Migration
-- This migration expands the audit trail system to track all critical operations

-- Step 1: Add new columns to AuditLog table
ALTER TABLE `AuditLog` 
ADD COLUMN `entity` VARCHAR(191) NOT NULL DEFAULT 'Idea' AFTER `action`,
ADD COLUMN `entityId` INTEGER NULL AFTER `entity`,
ADD COLUMN `ipAddress` VARCHAR(191) NULL AFTER `message`,
ADD COLUMN `userAgent` TEXT NULL AFTER `ipAddress`;

-- Step 2: Update indexes for better query performance
CREATE INDEX `AuditLog_action_idx` ON `AuditLog`(`action`);
CREATE INDEX `AuditLog_entity_entityId_idx` ON `AuditLog`(`entity`, `entityId`);
CREATE INDEX `AuditLog_createdAt_idx` ON `AuditLog`(`createdAt`);

-- Step 3: Modify message column to TEXT for longer messages
ALTER TABLE `AuditLog` 
MODIFY COLUMN `message` TEXT NOT NULL;

-- Step 4: Backfill existing records with default entity
UPDATE `AuditLog` SET `entity` = 'Idea' WHERE `ideaId` IS NOT NULL AND `entity` = 'Idea';
UPDATE `AuditLog` SET `entityId` = `ideaId` WHERE `ideaId` IS NOT NULL AND `entityId` IS NULL;

-- Note: The AuditAction enum will be updated automatically when you regenerate Prisma Client
-- Run: npx prisma generate
