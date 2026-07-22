CREATE TYPE "public"."building_status" AS ENUM('not_started', 'in_progress', 'completed', 'on_hold');--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "status" "building_status" DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "deadline" date;