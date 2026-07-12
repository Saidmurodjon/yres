CREATE TYPE "public"."audit_run_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."building_type" AS ENUM('residential_mfh', 'residential_sfh', 'office', 'school', 'kindergarten', 'hospital', 'administrative', 'other');--> statement-breakpoint
CREATE TYPE "public"."distribution_system_type" AS ENUM('heating', 'dhw');--> statement-breakpoint
CREATE TYPE "public"."end_use" AS ENUM('heating', 'dhw', 'cooling');--> statement-breakpoint
CREATE TYPE "public"."energy_carrier" AS ENUM('gas', 'electricity', 'district_heat', 'coal');--> statement-breakpoint
CREATE TYPE "public"."envelope_element_category" AS ENUM('external_wall', 'socle_heated', 'socle_unheated', 'socle_ground', 'roof', 'floor');--> statement-breakpoint
CREATE TYPE "public"."generation_source_type" AS ENUM('gas_boiler', 'electric_boiler', 'district_heating', 'solar_dhw', 'split_ac', 'centralized_ac', 'heat_pump', 'other');--> statement-breakpoint
CREATE TYPE "public"."measure_category" AS ENUM('envelope_wall_insulation', 'envelope_roof_insulation', 'envelope_floor_insulation', 'window_replacement', 'heating_system', 'gas_boiler_replacement', 'mechanical_ventilation_heat_recovery', 'lighting', 'equipment_replacement', 'pv', 'solar_dhw', 'ems', 'other');--> statement-breakpoint
CREATE TYPE "public"."opening_category" AS ENUM('window', 'door');--> statement-breakpoint
CREATE TYPE "public"."orientation" AS ENUM('north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'horizontal');--> statement-breakpoint
CREATE TYPE "public"."renewable_system_type" AS ENUM('pv', 'solar_dhw');--> statement-breakpoint
CREATE TYPE "public"."scenario" AS ENUM('before', 'after');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'auditor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "climate_monthly_normal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"climate_region_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"avg_outdoor_temp_c" numeric NOT NULL,
	"heating_days_in_month" integer,
	"solar_radiation_south_kwh_m2" numeric,
	"solar_radiation_north_kwh_m2" numeric,
	"solar_radiation_east_west_kwh_m2" numeric,
	"solar_radiation_se_sw_kwh_m2" numeric,
	"solar_radiation_ne_nw_kwh_m2" numeric,
	"solar_radiation_horizontal_kwh_m2" numeric,
	"is_heating_season_month" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "climate_region" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"design_outdoor_temp_c" numeric NOT NULL,
	"avg_annual_temp_c" numeric,
	"min_absolute_temp_c" numeric,
	"max_absolute_temp_c" numeric
);
--> statement-breakpoint
CREATE TABLE "lamp_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"power_density_w_per_m2" numeric NOT NULL,
	CONSTRAINT "lamp_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "material" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"thermal_conductivity_w_per_mk" numeric NOT NULL,
	CONSTRAINT "material_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pipe_loss_reference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diameter_class" text NOT NULL,
	"insulated" text NOT NULL,
	"mean_fluid_temp_c" numeric,
	"max_heat_flux_w_per_m" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surface_resistance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"element_category" text NOT NULL,
	"interior_resistance_m2k_per_w" numeric NOT NULL,
	"exterior_resistance_m2k_per_w" numeric NOT NULL,
	CONSTRAINT "surface_resistance_element_category_unique" UNIQUE("element_category")
);
--> statement-breakpoint
CREATE TABLE "building" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"climate_region_id" uuid NOT NULL,
	"building_type" "building_type" DEFAULT 'other' NOT NULL,
	"year_built" integer,
	"net_cooled_floor_area_m2" numeric DEFAULT 0,
	"heating_season_duration_days" integer NOT NULL,
	"indoor_temp_non_operation_c" numeric NOT NULL,
	"indoor_temp_operation_c" numeric NOT NULL,
	"outdoor_avg_heating_season_temp_c" numeric NOT NULL,
	"outdoor_design_temp_c" numeric NOT NULL,
	"non_operation_hours_per_day" numeric NOT NULL,
	"operation_hours_per_day" numeric NOT NULL,
	"occupant_count" integer DEFAULT 0 NOT NULL,
	"cooling_enthalpy_inside_kj_kg" numeric,
	"cooling_enthalpy_outside_kj_kg" numeric,
	"cooling_enthalpy_hottest_day_kj_kg" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "building_block" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"name" text NOT NULL,
	"footprint_length_m" numeric NOT NULL,
	"footprint_width_m" numeric NOT NULL,
	"number_of_floors" integer NOT NULL,
	"floor_to_floor_height_m" numeric NOT NULL,
	"perimeter_m" numeric NOT NULL,
	"perimeter_loss_coefficient" numeric DEFAULT 0.4 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_layer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"construction_type_id" uuid NOT NULL,
	"layer_order" integer NOT NULL,
	"material_id" uuid NOT NULL,
	"thickness_m" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"code" text NOT NULL,
	"element_category" "envelope_element_category" NOT NULL,
	"scenario" "scenario" DEFAULT 'before' NOT NULL,
	"retrofit_of_id" uuid,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "envelope_element" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"block_name" text NOT NULL,
	"orientation" "orientation" NOT NULL,
	"side_code" text,
	"description" text,
	"construction_type_id" uuid NOT NULL,
	"length_m" numeric NOT NULL,
	"height_env_contact_m" numeric DEFAULT 0,
	"height_ground_contact_m" numeric DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "envelope_opening" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"envelope_element_id" uuid NOT NULL,
	"opening_type_id" uuid NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opening_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"code" text NOT NULL,
	"category" "opening_category" NOT NULL,
	"scenario" "scenario" DEFAULT 'before' NOT NULL,
	"retrofit_of_id" uuid,
	"u_value_w_m2k" numeric NOT NULL,
	"width_m" numeric,
	"height_m" numeric,
	"g_value" numeric,
	"frame_factor" numeric,
	"shading_factor" numeric DEFAULT 1 NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "ventilation_system" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"scenario" "scenario" NOT NULL,
	"system_type" text NOT NULL,
	"air_change_rate_per_hour" numeric,
	"fresh_air_per_person_m3h" numeric,
	"heat_recovery_efficiency" numeric,
	"fan_electrical_power_kw" numeric
);
--> statement-breakpoint
CREATE TABLE "dhw_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"scenario" "scenario" NOT NULL,
	"source_name" text NOT NULL,
	"energy_carrier" "energy_carrier" NOT NULL,
	"specific_consumption_l_person_day" numeric NOT NULL,
	"persons_served" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distribution_system" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"system_type" "distribution_system_type" NOT NULL,
	"scenario" "scenario" NOT NULL,
	"pipe_diameter_class" text NOT NULL,
	"length_m" numeric NOT NULL,
	"insulated_fraction" numeric DEFAULT 0 NOT NULL,
	"mean_fluid_temp_c" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"scenario" "scenario" NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"unit_power_kw" numeric NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"heating_season_hours" numeric DEFAULT 0 NOT NULL,
	"cooling_season_hours" numeric DEFAULT 0 NOT NULL,
	"heating_utilization_factor" numeric DEFAULT 1 NOT NULL,
	"cooling_utilization_factor" numeric DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lighting_zone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"scenario" "scenario" NOT NULL,
	"name" text NOT NULL,
	"area_m2" numeric NOT NULL,
	"technology_mix" jsonb NOT NULL,
	"utilization_factor" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cooling_system" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"scenario" "scenario" NOT NULL,
	"description" text,
	"seer" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cooling_window" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"scenario" "scenario" NOT NULL,
	"orientation" "orientation" NOT NULL,
	"area_m2" numeric NOT NULL,
	"g_value" numeric NOT NULL,
	"shading_factor" numeric DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"end_use" "end_use" NOT NULL,
	"scenario" "scenario" NOT NULL,
	"source_type" "generation_source_type" NOT NULL,
	"efficiency_or_seer" numeric NOT NULL,
	"share_of_demand" numeric DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renewable_production_monthly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"renewable_system_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"production_kwh" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renewable_system" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"system_type" "renewable_system_type" NOT NULL,
	"capacity_kw" numeric,
	"collector_count" integer,
	"available_area_m2" numeric NOT NULL,
	"unit_cost_usd" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shading_element" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"description" text NOT NULL,
	"orientation" "orientation" NOT NULL,
	"shading_factor" numeric NOT NULL,
	"unit_cost_usd" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_measure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "measure_category" NOT NULL,
	"investment_cost_usd" numeric NOT NULL,
	"lifetime_years" integer DEFAULT 20 NOT NULL,
	"maintenance_cost_percent" numeric DEFAULT 0 NOT NULL,
	"proposed_for_implementation" boolean DEFAULT false NOT NULL,
	"source_sheet_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "non_ee_measure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"description" text NOT NULL,
	"unit" text,
	"quantity" numeric DEFAULT 1 NOT NULL,
	"unit_cost_usd" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_tariff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"energy_carrier" "energy_carrier" NOT NULL,
	"unit_cost_local" numeric NOT NULL,
	"unit_cost_usd" numeric NOT NULL,
	"emission_factor_kg_co2_per_kwh" numeric NOT NULL,
	"primary_energy_factor" numeric NOT NULL,
	"exchange_rate_local_per_usd" numeric NOT NULL,
	"effective_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utility_bill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"energy_carrier" "energy_carrier" NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"consumption_native" numeric NOT NULL,
	"consumption_kwh" numeric,
	"expense_local" numeric,
	"tariff_local" numeric
);
--> statement-breakpoint
CREATE TABLE "audit_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"triggered_by_user_id" text NOT NULL,
	"status" "audit_run_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"report_r2_key" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "climate_monthly_normal" ADD CONSTRAINT "climate_monthly_normal_climate_region_id_climate_region_id_fk" FOREIGN KEY ("climate_region_id") REFERENCES "public"."climate_region"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building" ADD CONSTRAINT "building_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building" ADD CONSTRAINT "building_climate_region_id_climate_region_id_fk" FOREIGN KEY ("climate_region_id") REFERENCES "public"."climate_region"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_block" ADD CONSTRAINT "building_block_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_layer" ADD CONSTRAINT "construction_layer_construction_type_id_construction_type_id_fk" FOREIGN KEY ("construction_type_id") REFERENCES "public"."construction_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_layer" ADD CONSTRAINT "construction_layer_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_type" ADD CONSTRAINT "construction_type_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_type" ADD CONSTRAINT "construction_type_retrofit_of_id_construction_type_id_fk" FOREIGN KEY ("retrofit_of_id") REFERENCES "public"."construction_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_element" ADD CONSTRAINT "envelope_element_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_element" ADD CONSTRAINT "envelope_element_construction_type_id_construction_type_id_fk" FOREIGN KEY ("construction_type_id") REFERENCES "public"."construction_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_opening" ADD CONSTRAINT "envelope_opening_envelope_element_id_envelope_element_id_fk" FOREIGN KEY ("envelope_element_id") REFERENCES "public"."envelope_element"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope_opening" ADD CONSTRAINT "envelope_opening_opening_type_id_opening_type_id_fk" FOREIGN KEY ("opening_type_id") REFERENCES "public"."opening_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_type" ADD CONSTRAINT "opening_type_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_type" ADD CONSTRAINT "opening_type_retrofit_of_id_opening_type_id_fk" FOREIGN KEY ("retrofit_of_id") REFERENCES "public"."opening_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventilation_system" ADD CONSTRAINT "ventilation_system_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dhw_source" ADD CONSTRAINT "dhw_source_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_system" ADD CONSTRAINT "distribution_system_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_item" ADD CONSTRAINT "equipment_item_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lighting_zone" ADD CONSTRAINT "lighting_zone_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooling_system" ADD CONSTRAINT "cooling_system_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooling_window" ADD CONSTRAINT "cooling_window_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_source" ADD CONSTRAINT "generation_source_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewable_production_monthly" ADD CONSTRAINT "renewable_production_monthly_renewable_system_id_renewable_system_id_fk" FOREIGN KEY ("renewable_system_id") REFERENCES "public"."renewable_system"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewable_system" ADD CONSTRAINT "renewable_system_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shading_element" ADD CONSTRAINT "shading_element_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_measure" ADD CONSTRAINT "energy_measure_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_ee_measure" ADD CONSTRAINT "non_ee_measure_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_bill" ADD CONSTRAINT "utility_bill_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_run" ADD CONSTRAINT "audit_run_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_run" ADD CONSTRAINT "audit_run_triggered_by_user_id_user_id_fk" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;