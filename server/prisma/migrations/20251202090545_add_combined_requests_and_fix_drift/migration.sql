-- AlterTable LoadBalancingSettings - Fix drift from manual change using compatible MySQL syntax
SET @dbname = DATABASE();
SET @tablename = "loadbalancingsettings";
SET @columnname = "splinteringEnabled";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE table_name = @tablename AND table_schema = @dbname
  ) > 0 AND (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname
  ) = 0,
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BOOLEAN NOT NULL DEFAULT false"),
  "SELECT 1"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- CreateTable CombinedRequest
CREATE TABLE `CombinedRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reference` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `config` JSON NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CombinedRequest_reference_key`(`reference`),
    INDEX `CombinedRequest_reference_idx`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable Request - Add combined request tracking fields
ALTER TABLE `Request` ADD COLUMN `isCombined` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `combinedRequestId` INTEGER NULL,
    ADD COLUMN `lotNumber` INTEGER NULL;

-- AlterTable Evaluation - Add combinedRequestId link
ALTER TABLE `Evaluation` ADD COLUMN `combinedRequestId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Request_combinedRequestId_idx` ON `Request`(`combinedRequestId`);
CREATE INDEX `Evaluation_combinedRequestId_idx` ON `Evaluation`(`combinedRequestId`);

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_combinedRequestId_fkey` FOREIGN KEY (`combinedRequestId`) REFERENCES `CombinedRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_combinedRequestId_fkey` FOREIGN KEY (`combinedRequestId`) REFERENCES `CombinedRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
