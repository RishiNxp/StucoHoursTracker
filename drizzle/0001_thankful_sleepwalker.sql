PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`school_year_start` text NOT NULL,
	`school_year_end` text NOT NULL,
	`cap_hours` real DEFAULT 25 NOT NULL,
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
INSERT INTO `__new_analyses`("id", "organization_id", "school_year_start", "school_year_end", "cap_hours", "status", "summary_json", "configuration_json", "results_json", "team_upload_id", "upcoming_upload_id", "created_by", "created_at") SELECT "id", "organization_id", "school_year_start", "school_year_end", "cap_hours", "status", "summary_json", "configuration_json", "results_json", "team_upload_id", "upcoming_upload_id", "created_by", "created_at" FROM `analyses`;--> statement-breakpoint
DROP TABLE `analyses`;--> statement-breakpoint
ALTER TABLE `__new_analyses` RENAME TO `analyses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_analyses_org_created_at` ON `analyses` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analyses_org_id` ON `analyses` (`organization_id`,`id`);