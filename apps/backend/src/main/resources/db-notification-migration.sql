-- Additive migration for installations that manage schema outside Hibernate.
ALTER TABLE `mci_notification` ADD COLUMN IF NOT EXISTS `dedupe_key` VARCHAR(512) NULL;
-- Run these once on MySQL after checking that no duplicate non-null keys exist:
-- CREATE UNIQUE INDEX `ux_mci_notification_dedupe_key` ON `mci_notification` (`dedupe_key`);
-- CREATE INDEX `ix_mci_notification_user_read_created` ON `mci_notification` (`user_id`, `is_read`, `created_on`);
-- CREATE UNIQUE INDEX `ux_mci_task_decision_task` ON `mci_task_decisions` (`task_id`);