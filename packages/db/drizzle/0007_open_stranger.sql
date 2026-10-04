CREATE TABLE `audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`action` text NOT NULL,
	`entity_revision` integer NOT NULL,
	`summary` text,
	`request_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_event_building_entity_revision_unique` ON `audit_event` (`building_id`,`entity`,`entity_revision`);--> statement-breakpoint
CREATE INDEX `audit_event_building_created_at_idx` ON `audit_event` (`building_id`,`created_at`);