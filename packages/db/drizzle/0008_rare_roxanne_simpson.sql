CREATE INDEX "building_user_id_idx" ON "building" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_run_building_id_idx" ON "audit_run" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "building_member_user_id_idx" ON "building_member" USING btree ("user_id");