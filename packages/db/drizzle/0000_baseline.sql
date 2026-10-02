CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'auditor' NOT NULL,
	`username` text NOT NULL,
	`last_seen_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `climate_monthly_normal` (
	`id` text PRIMARY KEY NOT NULL,
	`climate_region_id` text NOT NULL,
	`month` integer NOT NULL,
	`avg_outdoor_temp_c` real NOT NULL,
	`heating_days_in_month` integer,
	`solar_radiation_south_kwh_m2` real,
	`solar_radiation_north_kwh_m2` real,
	`solar_radiation_east_west_kwh_m2` real,
	`solar_radiation_se_sw_kwh_m2` real,
	`solar_radiation_ne_nw_kwh_m2` real,
	`solar_radiation_horizontal_kwh_m2` real,
	`is_heating_season_month` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`climate_region_id`) REFERENCES `climate_region`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `climate_region` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`design_outdoor_temp_c` real NOT NULL,
	`avg_annual_temp_c` real,
	`min_absolute_temp_c` real,
	`max_absolute_temp_c` real
);
--> statement-breakpoint
CREATE TABLE `lamp_type` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`power_density_w_per_m2` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lamp_type_name_unique` ON `lamp_type` (`name`);--> statement-breakpoint
CREATE TABLE `material` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`thermal_conductivity_w_per_mk` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `material_name_unique` ON `material` (`name`);--> statement-breakpoint
CREATE TABLE `pipe_loss_reference` (
	`id` text PRIMARY KEY NOT NULL,
	`diameter_class` text NOT NULL,
	`insulated` text NOT NULL,
	`mean_fluid_temp_c` real,
	`max_heat_flux_w_per_m` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `surface_resistance` (
	`id` text PRIMARY KEY NOT NULL,
	`element_category` text NOT NULL,
	`interior_resistance_m2k_per_w` real NOT NULL,
	`exterior_resistance_m2k_per_w` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `surface_resistance_element_category_unique` ON `surface_resistance` (`element_category`);--> statement-breakpoint
CREATE TABLE `building` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`location` text NOT NULL,
	`search_text` text DEFAULT '' NOT NULL,
	`climate_region_id` text NOT NULL,
	`building_type` text DEFAULT 'other' NOT NULL,
	`year_built` integer,
	`status` text DEFAULT 'not_started' NOT NULL,
	`deadline` text,
	`latitude` real,
	`longitude` real,
	`net_cooled_floor_area_m2` real DEFAULT 0,
	`heating_season_duration_days` integer NOT NULL,
	`indoor_temp_non_operation_c` real NOT NULL,
	`indoor_temp_operation_c` real NOT NULL,
	`outdoor_avg_heating_season_temp_c` real NOT NULL,
	`outdoor_design_temp_c` real NOT NULL,
	`non_operation_hours_per_day` real NOT NULL,
	`operation_hours_per_day` real NOT NULL,
	`occupant_count` integer DEFAULT 0 NOT NULL,
	`cooling_enthalpy_inside_kj_kg` real,
	`cooling_enthalpy_outside_kj_kg` real,
	`cooling_enthalpy_hottest_day_kj_kg` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`climate_region_id`) REFERENCES `climate_region`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `building_user_id_idx` ON `building` (`user_id`);--> statement-breakpoint
CREATE TABLE `building_block` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`name` text NOT NULL,
	`footprint_length_m` real NOT NULL,
	`footprint_width_m` real NOT NULL,
	`number_of_floors` integer NOT NULL,
	`floor_to_floor_height_m` real NOT NULL,
	`perimeter_m` real NOT NULL,
	`perimeter_loss_coefficient` real DEFAULT 0.4 NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `construction_layer` (
	`id` text PRIMARY KEY NOT NULL,
	`construction_type_id` text NOT NULL,
	`layer_order` integer NOT NULL,
	`material_id` text NOT NULL,
	`thickness_m` real NOT NULL,
	FOREIGN KEY (`construction_type_id`) REFERENCES `construction_type`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `material`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `construction_type` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`code` text NOT NULL,
	`element_category` text NOT NULL,
	`scenario` text DEFAULT 'before' NOT NULL,
	`retrofit_of_id` text,
	`description` text,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`retrofit_of_id`) REFERENCES `construction_type`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `envelope_element` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`block_name` text NOT NULL,
	`orientation` text NOT NULL,
	`side_code` text,
	`description` text,
	`construction_type_id` text NOT NULL,
	`length_m` real NOT NULL,
	`height_env_contact_m` real DEFAULT 0,
	`height_ground_contact_m` real DEFAULT 0,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`construction_type_id`) REFERENCES `construction_type`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `envelope_opening` (
	`id` text PRIMARY KEY NOT NULL,
	`envelope_element_id` text NOT NULL,
	`opening_type_id` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`envelope_element_id`) REFERENCES `envelope_element`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opening_type_id`) REFERENCES `opening_type`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `opening_type` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`code` text NOT NULL,
	`category` text NOT NULL,
	`scenario` text DEFAULT 'before' NOT NULL,
	`retrofit_of_id` text,
	`u_value_w_m2k` real NOT NULL,
	`width_m` real,
	`height_m` real,
	`g_value` real,
	`frame_factor` real,
	`shading_factor` real DEFAULT 1 NOT NULL,
	`description` text,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`retrofit_of_id`) REFERENCES `opening_type`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ventilation_system` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`scenario` text NOT NULL,
	`system_type` text NOT NULL,
	`air_change_rate_per_hour` real,
	`fresh_air_per_person_m3h` real,
	`heat_recovery_efficiency` real,
	`fan_electrical_power_kw` real,
	`cooling_season_hours` real,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dhw_source` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`scenario` text NOT NULL,
	`source_name` text NOT NULL,
	`energy_carrier` text NOT NULL,
	`specific_consumption_l_person_day` real NOT NULL,
	`persons_served` integer NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `distribution_system` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`system_type` text NOT NULL,
	`scenario` text NOT NULL,
	`pipe_diameter_class` text NOT NULL,
	`length_m` real NOT NULL,
	`insulated_fraction` real DEFAULT 0 NOT NULL,
	`mean_fluid_temp_c` real NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `equipment_item` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`scenario` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`unit_power_kw` real NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`heating_season_hours` real DEFAULT 0 NOT NULL,
	`cooling_season_hours` real DEFAULT 0 NOT NULL,
	`heating_utilization_factor` real DEFAULT 1 NOT NULL,
	`cooling_utilization_factor` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lighting_zone` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`scenario` text NOT NULL,
	`name` text NOT NULL,
	`area_m2` real NOT NULL,
	`technology_mix` text NOT NULL,
	`utilization_factor` real NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cooling_system` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`scenario` text NOT NULL,
	`description` text,
	`seer` real NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cooling_window` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`scenario` text NOT NULL,
	`orientation` text NOT NULL,
	`area_m2` real NOT NULL,
	`g_value` real NOT NULL,
	`shading_factor` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `generation_source` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`end_use` text NOT NULL,
	`scenario` text NOT NULL,
	`source_type` text NOT NULL,
	`efficiency_or_seer` real NOT NULL,
	`share_of_demand` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `renewable_production_monthly` (
	`id` text PRIMARY KEY NOT NULL,
	`renewable_system_id` text NOT NULL,
	`month` integer NOT NULL,
	`production_kwh` real NOT NULL,
	FOREIGN KEY (`renewable_system_id`) REFERENCES `renewable_system`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `renewable_system` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`system_type` text NOT NULL,
	`capacity_kw` real,
	`collector_count` integer,
	`available_area_m2` real NOT NULL,
	`unit_cost_usd` real NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shading_element` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`description` text NOT NULL,
	`orientation` text NOT NULL,
	`shading_factor` real NOT NULL,
	`unit_cost_usd` real NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `energy_measure` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`investment_cost_usd` real NOT NULL,
	`lifetime_years` integer DEFAULT 20 NOT NULL,
	`maintenance_cost_percent` real DEFAULT 0 NOT NULL,
	`proposed_for_implementation` integer DEFAULT false NOT NULL,
	`source_sheet_ref` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `non_ee_measure` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`description` text NOT NULL,
	`unit` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_cost_usd` real NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `energy_tariff` (
	`id` text PRIMARY KEY NOT NULL,
	`energy_carrier` text NOT NULL,
	`unit_cost_local` real NOT NULL,
	`unit_cost_usd` real NOT NULL,
	`emission_factor_kg_co2_per_kwh` real NOT NULL,
	`primary_energy_factor` real NOT NULL,
	`exchange_rate_local_per_usd` real NOT NULL,
	`effective_date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `utility_bill` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`energy_carrier` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`consumption_native` real NOT NULL,
	`consumption_kwh` real,
	`expense_local` real,
	`tariff_local` real,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `utility_bill_building_id_energy_carrier_year_month_unique` ON `utility_bill` (`building_id`,`energy_carrier`,`year`,`month`);--> statement-breakpoint
CREATE TABLE `audit_run` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`triggered_by_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`report_r2_key` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`triggered_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_run_building_id_idx` ON `audit_run` (`building_id`);--> statement-breakpoint
CREATE TABLE `building_member` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `building_member_user_id_idx` ON `building_member` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `building_member_building_id_user_id_unique` ON `building_member` (`building_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`link_url` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_user_created_at_idx` ON `notification` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conversation_member` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL,
	`last_read_at` integer,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_member_conversation_id_user_id_unique` ON `conversation_member` (`conversation_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`reply_to_id` text,
	`created_at` integer NOT NULL,
	`edited_at` integer,
	`deleted_at` integer,
	`attachment_url` text,
	`attachment_name` text,
	`attachment_mime_type` text,
	`attachment_size_bytes` integer,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reply_to_id`) REFERENCES `message`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `message_conversation_created_at_idx` ON `message` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `report_annotation` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`section_key` text NOT NULL,
	`note` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_annotation_building_id_section_key_unique` ON `report_annotation` (`building_id`,`section_key`);