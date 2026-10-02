ALTER TABLE `building` ADD `working_days_per_year` integer;--> statement-breakpoint
ALTER TABLE `cooling_system` ADD `distribution_efficiency` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `generation_source` ADD `distribution_efficiency` real;