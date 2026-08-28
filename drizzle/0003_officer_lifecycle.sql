ALTER TABLE `invitations` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `invitations` ADD `invalidated_at` integer;--> statement-breakpoint
CREATE INDEX `idx_invitations_org_email` ON `invitations` (`organization_id`,`email`);--> statement-breakpoint
ALTER TABLE `memberships` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `memberships` ADD `deactivated_at` integer;--> statement-breakpoint
CREATE INDEX `idx_memberships_org_email` ON `memberships` (`organization_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_memberships_org_active` ON `memberships` (`organization_id`,`active`);