import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { building } from "./buildings";
import { auditRunStatusEnum } from "./enums";

export const auditRun = pgTable(
  "audit_run",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => building.id, { onDelete: "cascade" }),
    triggeredByUserId: text("triggered_by_user_id")
      .notNull()
      .references(() => user.id),
    status: auditRunStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    reportR2Key: text("report_r2_key"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("audit_run_building_id_idx").on(table.buildingId)],
);

export const auditRunRelations = relations(auditRun, ({ one }) => ({
  building: one(building, { fields: [auditRun.buildingId], references: [building.id] }),
  triggeredBy: one(user, { fields: [auditRun.triggeredByUserId], references: [user.id] }),
}));
