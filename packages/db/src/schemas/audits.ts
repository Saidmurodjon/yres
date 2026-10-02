import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { building } from "./buildings";
import { auditRunStatusEnum } from "./enums";

export const auditRun = sqliteTable(
  "audit_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    buildingId: text("building_id")
      .notNull()
      .references(() => building.id, { onDelete: "cascade" }),
    triggeredByUserId: text("triggered_by_user_id")
      .notNull()
      .references(() => user.id),
    status: text("status", { enum: auditRunStatusEnum.enumValues }).notNull().default("pending"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    reportR2Key: text("report_r2_key"),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("audit_run_building_id_idx").on(table.buildingId)],
);

export const auditRunRelations = relations(auditRun, ({ one }) => ({
  building: one(building, { fields: [auditRun.buildingId], references: [building.id] }),
  triggeredBy: one(user, { fields: [auditRun.triggeredByUserId], references: [user.id] }),
}));
