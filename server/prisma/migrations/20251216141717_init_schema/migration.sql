-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NULL,
    `profileImage` VARCHAR(191) NULL,
    `pinnedModule` VARCHAR(191) NULL DEFAULT 'procurement',
    `ldapDN` VARCHAR(191) NULL,
    `employeeId` VARCHAR(191) NULL,
    `jobTitle` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `supervisor` VARCHAR(191) NULL,
    `departmentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `failedLogins` INTEGER NULL DEFAULT 0,
    `lastFailedLogin` DATETIME(3) NULL,
    `lastLogin` DATETIME(3) NULL,
    `blocked` BOOLEAN NULL DEFAULT false,
    `blockedAt` DATETIME(3) NULL,
    `blockedReason` VARCHAR(191) NULL,

    UNIQUE INDEX `User_externalId_key`(`externalId`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `managerId` INTEGER NULL,

    UNIQUE INDEX `Department_code_key`(`code`),
    UNIQUE INDEX `Department_managerId_key`(`managerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
CREATE TABLE `UserRole` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,

    UNIQUE INDEX `UserRole_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FundingSource` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vendor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contact` JSON NULL,
    `address` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Request` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reference` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `requesterId` INTEGER NOT NULL,
    `departmentId` INTEGER NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'DEPARTMENT_REVIEW', 'DEPARTMENT_RETURNED', 'DEPARTMENT_APPROVED', 'EXECUTIVE_REVIEW', 'HOD_REVIEW', 'PROCUREMENT_REVIEW', 'FINANCE_REVIEW', 'FINANCE_RETURNED', 'BUDGET_MANAGER_REVIEW', 'FINANCE_APPROVED', 'SENT_TO_VENDOR', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `fundingSourceId` INTEGER NULL,
    `budgetCode` VARCHAR(191) NULL,
    `totalEstimated` DECIMAL(12, 2) NULL,
    `currency` VARCHAR(191) NULL DEFAULT 'USD',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NULL DEFAULT 'MEDIUM',
    `procurementType` JSON NULL,
    `expectedDelivery` DATETIME(3) NULL,
    `currentAssigneeId` INTEGER NULL,
    `vendorId` INTEGER NULL,
    `managerName` VARCHAR(191) NULL,
    `headName` VARCHAR(191) NULL,
    `managerApproved` BOOLEAN NULL DEFAULT false,
    `headApproved` BOOLEAN NULL DEFAULT false,
    `commitmentNumber` VARCHAR(191) NULL,
    `accountingCode` VARCHAR(191) NULL,
    `budgetComments` VARCHAR(191) NULL,
    `budgetOfficerName` VARCHAR(191) NULL,
    `budgetManagerName` VARCHAR(191) NULL,
    `procurementCaseNumber` VARCHAR(191) NULL,
    `receivedBy` VARCHAR(191) NULL,
    `dateReceived` VARCHAR(191) NULL,
    `procurementApproved` BOOLEAN NULL DEFAULT false,
    `actionDate` VARCHAR(191) NULL,
    `procurementComments` VARCHAR(191) NULL,
    `headerDeptCode` VARCHAR(191) NULL,
    `headerMonth` VARCHAR(191) NULL,
    `headerYear` INTEGER NULL,
    `headerSequence` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NULL,
    `isCombined` BOOLEAN NULL DEFAULT false,
    `combinedRequestId` INTEGER NULL,
    `lotNumber` INTEGER NULL,

    UNIQUE INDEX `Request_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `RequestItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `accountCode` VARCHAR(191) NULL,
    `stockLevel` VARCHAR(191) NULL,
    `unitOfMeasure` VARCHAR(191) NULL,
    `partNumber` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestAttachment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `uploadedById` INTEGER NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestAction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `action` ENUM('SUBMIT', 'APPROVE', 'RETURN', 'ASSIGN', 'EDIT_BUDGET', 'COMMENT', 'SEND_TO_VENDOR') NOT NULL,
    `comment` VARCHAR(191) NULL,
    `performedById` INTEGER NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestStatusHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'DEPARTMENT_REVIEW', 'DEPARTMENT_RETURNED', 'DEPARTMENT_APPROVED', 'EXECUTIVE_REVIEW', 'HOD_REVIEW', 'PROCUREMENT_REVIEW', 'FINANCE_REVIEW', 'FINANCE_RETURNED', 'BUDGET_MANAGER_REVIEW', 'FINANCE_APPROVED', 'SENT_TO_VENDOR', 'CLOSED', 'REJECTED') NOT NULL,
    `changedById` INTEGER NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Idea` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `descriptionHtml` TEXT NULL,
    `category` ENUM('PROCESS_IMPROVEMENT', 'TECHNOLOGY', 'CUSTOMER_SERVICE', 'SUSTAINABILITY', 'COST_REDUCTION', 'PRODUCT_INNOVATION', 'OTHER') NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PROMOTED_TO_PROJECT') NOT NULL DEFAULT 'DRAFT',
    `stage` ENUM('DISCOVERY', 'EVALUATION', 'INCUBATION', 'IMPLEMENTATION', 'COMPLETED') NOT NULL DEFAULT 'DISCOVERY',
    `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
    `challengeId` INTEGER NULL,
    `submittedBy` INTEGER NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `promotedAt` DATETIME(3) NULL,
    `projectCode` VARCHAR(191) NULL,
    `voteCount` INTEGER NOT NULL DEFAULT 0,
    `upvoteCount` INTEGER NOT NULL DEFAULT 0,
    `downvoteCount` INTEGER NOT NULL DEFAULT 0,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `trendingScore` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Idea_projectCode_key`(`projectCode`),
    INDEX `Idea_status_idx`(`status`),
    INDEX `Idea_category_idx`(`category`),
    INDEX `Idea_submittedBy_idx`(`submittedBy`),
    INDEX `Idea_createdAt_idx`(`createdAt`),
    INDEX `Idea_voteCount_idx`(`voteCount`),
    INDEX `Idea_trendingScore_idx`(`trendingScore`),
    INDEX `Idea_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Idea_status_voteCount_idx`(`status`, `voteCount`),
    INDEX `Idea_status_trendingScore_idx`(`status`, `trendingScore`),
    INDEX `Idea_category_status_idx`(`category`, `status`),
    INDEX `Idea_submittedBy_status_idx`(`submittedBy`, `status`),
    INDEX `Idea_promotedAt_idx`(`promotedAt`),
    INDEX `Idea_reviewedBy_reviewedAt_idx`(`reviewedBy`, `reviewedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ideaId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `voteType` ENUM('UPVOTE', 'DOWNVOTE') NOT NULL DEFAULT 'UPVOTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Vote_ideaId_idx`(`ideaId`),
    INDEX `Vote_userId_idx`(`userId`),
    UNIQUE INDEX `Vote_ideaId_userId_key`(`ideaId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdeaComment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ideaId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `parentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `IdeaComment_ideaId_idx`(`ideaId`),
    INDEX `IdeaComment_userId_idx`(`userId`),
    INDEX `IdeaComment_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdeaAttachment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ideaId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `safeStatus` ENUM('PENDING', 'CLEAN', 'INFECTED') NOT NULL DEFAULT 'PENDING',
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IdeaAttachment_ideaId_idx`(`ideaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Tag_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdeaTag` (
    `ideaId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,

    INDEX `IdeaTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`ideaId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdeaCount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PROMOTED_TO_PROJECT') NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `IdeaCount_status_key`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Challenge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `startAt` DATETIME(3) NULL,
    `endAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdeaStageHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ideaId` INTEGER NOT NULL,
    `fromStage` ENUM('DISCOVERY', 'EVALUATION', 'INCUBATION', 'IMPLEMENTATION', 'COMPLETED') NULL,
    `toStage` ENUM('DISCOVERY', 'EVALUATION', 'INCUBATION', 'IMPLEMENTATION', 'COMPLETED') NOT NULL,
    `note` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IdeaStageHistory_ideaId_idx`(`ideaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `action` ENUM('USER_LOGIN', 'USER_LOGOUT', 'USER_LOGIN_FAILED', 'LDAP_LOGIN', 'PASSWORD_CHANGED', 'ROLE_ASSIGNED', 'ROLE_REMOVED', 'REQUEST_CREATED', 'REQUEST_UPDATED', 'REQUEST_DELETED', 'REQUEST_SUBMITTED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_FORWARDED', 'REQUEST_RETURNED', 'REQUEST_STATUS_CHANGED', 'PO_CREATED', 'PO_UPDATED', 'PO_APPROVED', 'PO_CANCELLED', 'APPROVAL_GRANTED', 'APPROVAL_DENIED', 'APPROVAL_DELEGATED', 'WORKFLOW_STAGE_CHANGED', 'BUDGET_ALLOCATED', 'BUDGET_MODIFIED', 'PAYMENT_PROCESSED', 'FILE_UPLOADED', 'FILE_DOWNLOADED', 'FILE_DELETED', 'IDEA_CREATED', 'IDEA_UPDATED', 'IDEA_VOTED', 'IDEA_DELETED', 'COMMENT_CREATED', 'COMMENT_DELETED', 'STAGE_CHANGED', 'TAGS_UPDATED', 'SUPPLIER_CREATED', 'SUPPLIER_UPDATED', 'SUPPLIER_APPROVED', 'SUPPLIER_SUSPENDED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'SETTINGS_CHANGED', 'REPORT_GENERATED', 'DATA_EXPORTED') NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NULL,
    `message` TEXT NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `metadata` JSON NULL,
    `ideaId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_ideaId_idx`(`ideaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('MENTION', 'STAGE_CHANGED', 'IDEA_APPROVED', 'THRESHOLD_EXCEEDED', 'EVALUATION_VERIFIED', 'EVALUATION_RETURNED') NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `data` JSON NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fromUserId` INTEGER NOT NULL,
    `toUserId` INTEGER NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Message_toUserId_idx`(`toUserId`),
    INDEX `Message_fromUserId_idx`(`fromUserId`),
    INDEX `Message_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evaluation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `evalNumber` VARCHAR(191) NOT NULL,
    `rfqNumber` VARCHAR(191) NOT NULL,
    `rfqTitle` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMMITTEE_REVIEW', 'COMPLETED', 'VALIDATED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `assignedProcurementOfficerId` INTEGER NULL,
    `combinedRequestId` INTEGER NULL,
    `requestId` INTEGER NULL,
    `sectionA` JSON NULL,
    `sectionAStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'VERIFIED') NOT NULL DEFAULT 'NOT_STARTED',
    `sectionAVerifiedBy` INTEGER NULL,
    `sectionAVerifiedAt` DATETIME(3) NULL,
    `sectionANotes` TEXT NULL,
    `sectionB` JSON NULL,
    `sectionBStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'VERIFIED') NOT NULL DEFAULT 'NOT_STARTED',
    `sectionBVerifiedBy` INTEGER NULL,
    `sectionBVerifiedAt` DATETIME(3) NULL,
    `sectionBNotes` TEXT NULL,
    `sectionC` JSON NULL,
    `sectionCStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'VERIFIED') NOT NULL DEFAULT 'NOT_STARTED',
    `sectionCVerifiedBy` INTEGER NULL,
    `sectionCVerifiedAt` DATETIME(3) NULL,
    `sectionCNotes` TEXT NULL,
    `sectionD` JSON NULL,
    `sectionDStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'VERIFIED') NOT NULL DEFAULT 'NOT_STARTED',
    `sectionDVerifiedBy` INTEGER NULL,
    `sectionDVerifiedAt` DATETIME(3) NULL,
    `sectionDNotes` TEXT NULL,
    `sectionE` JSON NULL,
    `sectionEStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'VERIFIED') NOT NULL DEFAULT 'NOT_STARTED',
    `sectionEVerifiedBy` INTEGER NULL,
    `sectionEVerifiedAt` DATETIME(3) NULL,
    `sectionENotes` TEXT NULL,
    `createdBy` INTEGER NOT NULL,
    `evaluator` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NULL,
    `validatedBy` INTEGER NULL,
    `validatedAt` DATETIME(3) NULL,
    `validationNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Evaluation_evalNumber_key`(`evalNumber`),
    INDEX `Evaluation_status_idx`(`status`),
    INDEX `Evaluation_createdBy_idx`(`createdBy`),
    INDEX `Evaluation_evalNumber_idx`(`evalNumber`),
    INDEX `Evaluation_requestId_idx`(`requestId`),
    INDEX `Evaluation_rfqNumber_idx`(`rfqNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EvaluationAssignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `evaluationId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `sections` JSON NOT NULL,
    `status` ENUM('PENDING', 'SUBMITTED') NOT NULL DEFAULT 'PENDING',
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EvaluationAssignment_userId_idx`(`userId`),
    UNIQUE INDEX `EvaluationAssignment_evaluationId_userId_key`(`evaluationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoadBalancingSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `strategy` ENUM('LEAST_LOADED', 'ROUND_ROBIN', 'RANDOM') NOT NULL DEFAULT 'LEAST_LOADED',
    `autoAssignOnApproval` BOOLEAN NOT NULL DEFAULT true,
    `splinteringEnabled` BOOLEAN NOT NULL DEFAULT false,
    `roundRobinCounter` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OfficerPerformanceMetrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `officerId` INTEGER NOT NULL,
    `activeAssignments` INTEGER NOT NULL DEFAULT 0,
    `completedAssignments` INTEGER NOT NULL DEFAULT 0,
    `averageTurnaroundMinutes` INTEGER NULL,
    `lastAssignmentAt` DATETIME(3) NULL,
    `loadScore` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OfficerPerformanceMetrics_officerId_idx`(`officerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestAssignmentLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `officerId` INTEGER NOT NULL,
    `strategy` ENUM('LEAST_LOADED', 'ROUND_ROBIN', 'RANDOM') NULL,
    `previousOfficerId` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RequestAssignmentLog_requestId_idx`(`requestId`),
    INDEX `RequestAssignmentLog_officerId_idx`(`officerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoleRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `departmentId` INTEGER NULL,
    `role` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reason` TEXT NULL,
    `notes` TEXT NULL,
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RoleRequest_userId_idx`(`userId`),
    INDEX `RoleRequest_status_idx`(`status`),
    INDEX `RoleRequest_createdAt_idx`(`createdAt`),
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

-- CreateTable
CREATE TABLE `SystemConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `valueType` VARCHAR(191) NOT NULL DEFAULT 'string',
    `description` TEXT NULL,
    `updatedBy` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SystemConfig_key_key`(`key`),
    INDEX `SystemConfig_key_idx`(`key`),
    INDEX `SystemConfig_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `WorkflowStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `statusId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#3B82F6',
    `icon` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WorkflowStatus_statusId_key`(`statusId`),
    INDEX `WorkflowStatus_isActive_idx`(`isActive`),
    INDEX `WorkflowStatus_displayOrder_idx`(`displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkflowSLA` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slaId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `fromStatus` VARCHAR(191) NOT NULL,
    `toStatus` VARCHAR(191) NOT NULL,
    `slaHours` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WorkflowSLA_slaId_key`(`slaId`),
    INDEX `WorkflowSLA_isActive_idx`(`isActive`),
    UNIQUE INDEX `WorkflowSLA_fromStatus_toStatus_key`(`fromStatus`, `toStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NavigationMenu` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `menuId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `path` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NavigationMenu_menuId_key`(`menuId`),
    INDEX `NavigationMenu_isActive_idx`(`isActive`),
    INDEX `NavigationMenu_displayOrder_idx`(`displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_fundingSourceId_fkey` FOREIGN KEY (`fundingSourceId`) REFERENCES `FundingSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_currentAssigneeId_fkey` FOREIGN KEY (`currentAssigneeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_combinedRequestId_fkey` FOREIGN KEY (`combinedRequestId`) REFERENCES `CombinedRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestItem` ADD CONSTRAINT `RequestItem_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestAttachment` ADD CONSTRAINT `RequestAttachment_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestAttachment` ADD CONSTRAINT `RequestAttachment_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestAction` ADD CONSTRAINT `RequestAction_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestAction` ADD CONSTRAINT `RequestAction_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestStatusHistory` ADD CONSTRAINT `RequestStatusHistory_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestStatusHistory` ADD CONSTRAINT `RequestStatusHistory_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Idea` ADD CONSTRAINT `Idea_challengeId_fkey` FOREIGN KEY (`challengeId`) REFERENCES `Challenge`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Idea` ADD CONSTRAINT `Idea_submittedBy_fkey` FOREIGN KEY (`submittedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_ideaId_fkey` FOREIGN KEY (`ideaId`) REFERENCES `Idea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdeaComment` ADD CONSTRAINT `IdeaComment_ideaId_fkey` FOREIGN KEY (`ideaId`) REFERENCES `Idea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdeaComment` ADD CONSTRAINT `IdeaComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdeaComment` ADD CONSTRAINT `IdeaComment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `IdeaComment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdeaAttachment` ADD CONSTRAINT `IdeaAttachment_ideaId_fkey` FOREIGN KEY (`ideaId`) REFERENCES `Idea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdeaTag` ADD CONSTRAINT `IdeaTag_ideaId_fkey` FOREIGN KEY (`ideaId`) REFERENCES `Idea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdeaTag` ADD CONSTRAINT `IdeaTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdeaStageHistory` ADD CONSTRAINT `IdeaStageHistory_ideaId_fkey` FOREIGN KEY (`ideaId`) REFERENCES `Idea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdeaStageHistory` ADD CONSTRAINT `IdeaStageHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_ideaId_fkey` FOREIGN KEY (`ideaId`) REFERENCES `Idea`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_assignedProcurementOfficerId_fkey` FOREIGN KEY (`assignedProcurementOfficerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_combinedRequestId_fkey` FOREIGN KEY (`combinedRequestId`) REFERENCES `CombinedRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_validatedBy_fkey` FOREIGN KEY (`validatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvaluationAssignment` ADD CONSTRAINT `EvaluationAssignment_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `Evaluation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvaluationAssignment` ADD CONSTRAINT `EvaluationAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoadBalancingSettings` ADD CONSTRAINT `LoadBalancingSettings_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfficerPerformanceMetrics` ADD CONSTRAINT `OfficerPerformanceMetrics_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestAssignmentLog` ADD CONSTRAINT `RequestAssignmentLog_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestAssignmentLog` ADD CONSTRAINT `RequestAssignmentLog_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoleRequest` ADD CONSTRAINT `RoleRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoleRequest` ADD CONSTRAINT `RoleRequest_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoleRequest` ADD CONSTRAINT `RoleRequest_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SplinteringAlert` ADD CONSTRAINT `SplinteringAlert_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
