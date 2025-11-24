-- AlterTable
ALTER TABLE `evaluation` ADD COLUMN `sectionANotes` TEXT NULL,
    ADD COLUMN `sectionAStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'VERIFIED') NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN `sectionAVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `sectionAVerifiedBy` INTEGER NULL,
    ADD COLUMN `sectionBNotes` TEXT NULL,
    ADD COLUMN `sectionBStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'VERIFIED') NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN `sectionBVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `sectionBVerifiedBy` INTEGER NULL,
    ADD COLUMN `sectionCNotes` TEXT NULL,
    ADD COLUMN `sectionCStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'VERIFIED') NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN `sectionCVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `sectionCVerifiedBy` INTEGER NULL,
    ADD COLUMN `sectionDNotes` TEXT NULL,
    ADD COLUMN `sectionDStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'VERIFIED') NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN `sectionDVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `sectionDVerifiedBy` INTEGER NULL,
    ADD COLUMN `sectionENotes` TEXT NULL,
    ADD COLUMN `sectionEStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'VERIFIED') NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN `sectionEVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `sectionEVerifiedBy` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_sectionAVerifiedBy_fkey` FOREIGN KEY (`sectionAVerifiedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_sectionBVerifiedBy_fkey` FOREIGN KEY (`sectionBVerifiedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_sectionCVerifiedBy_fkey` FOREIGN KEY (`sectionCVerifiedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_sectionDVerifiedBy_fkey` FOREIGN KEY (`sectionDVerifiedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_sectionEVerifiedBy_fkey` FOREIGN KEY (`sectionEVerifiedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
