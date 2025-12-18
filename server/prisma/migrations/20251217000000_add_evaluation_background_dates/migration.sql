-- AddEvaluationBackgroundDates
ALTER TABLE `Evaluation` ADD COLUMN `dateSubmissionConsidered` DATETIME(3) NULL;
ALTER TABLE `Evaluation` ADD COLUMN `reportCompletionDate` DATETIME(3) NULL;
