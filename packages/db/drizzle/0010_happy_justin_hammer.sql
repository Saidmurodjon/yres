CREATE TABLE `audit_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`engine_version` text NOT NULL,
	`methodology_version` text NOT NULL,
	`build_sha` text,
	`generated_at` text NOT NULL,
	`inputs_r2_key` text NOT NULL,
	`inputs_sha256` text NOT NULL,
	`result_r2_key` text NOT NULL,
	`result_sha256` text NOT NULL,
	`context_r2_key` text NOT NULL,
	`context_sha256` text NOT NULL,
	`summary` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`submitted_by_user_id` text,
	`submitted_at` integer,
	`approved_by_user_id` text,
	`approved_at` integer,
	`superseded_at` integer,
	`superseded_by_id` text,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_snapshot_building_created_at_idx` ON `audit_snapshot` (`building_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `audit_snapshot_building_approved_unique` ON `audit_snapshot` (`building_id`) WHERE "audit_snapshot"."status" = 'approved';--> statement-breakpoint
CREATE TABLE `audit_snapshot_report` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`lang` text NOT NULL,
	`r2_key` text NOT NULL,
	`sha256` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `audit_snapshot`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_snapshot_report_snapshot_lang_unique` ON `audit_snapshot_report` (`snapshot_id`,`lang`);