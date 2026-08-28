CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`school_year_start` text NOT NULL,
	`school_year_end` text NOT NULL,
	`cap_hours` integer DEFAULT 25 NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`summary_json` text DEFAULT '{}' NOT NULL,
	`configuration_json` text DEFAULT '{}' NOT NULL,
	`results_json` text DEFAULT '{}' NOT NULL,
	`team_upload_id` text,
	`upcoming_upload_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analyses_org_created_at` ON `analyses` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analyses_org_id` ON `analyses` (`organization_id`,`id`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text,
	`metadata_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`kind` text NOT NULL,
	`filename` text NOT NULL,
	`r2_key` text NOT NULL,
	`sha256` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
