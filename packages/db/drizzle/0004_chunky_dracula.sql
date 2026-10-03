CREATE TABLE `energy_measure_target` (
	`id` text PRIMARY KEY NOT NULL,
	`measure_id` text NOT NULL,
	`kind` text NOT NULL,
	`code` text NOT NULL,
	FOREIGN KEY (`measure_id`) REFERENCES `energy_measure`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `non_ee_measure` ADD `proposed_for_implementation` integer DEFAULT true NOT NULL;