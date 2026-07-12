CREATE TYPE "public"."building_member_role" AS ENUM('editor', 'viewer');--> statement-breakpoint
CREATE TABLE "building_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "building_member_role" NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "building_member_building_id_user_id_unique" UNIQUE("building_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "building_member" ADD CONSTRAINT "building_member_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_member" ADD CONSTRAINT "building_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_member" ADD CONSTRAINT "building_member_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;