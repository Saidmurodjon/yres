import { buildingFinancialParameters } from "@yres/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  auditEventStatement,
  getRevisions,
  isRevisionConflict,
  revisionConflictResponse,
} from "../lib/audit-event";
import { canWrite, findAccessibleBuilding } from "../lib/building-access";
import { defaultFinancialParameters } from "../lib/financial-defaults";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { financialParametersSchema } from "../schemas/financial";
import { deriveFinancialAssumptions } from "../services/financial.service";

export const financialRoutes = new Hono<AppEnv>();

financialRoutes.use("*", authMiddleware);

// GET /:id/financial-parameters - saved row, or the v7.20 defaults + isDefault + derived nominal `assumptions` (GET writes nothing)
financialRoutes.get("/:id/financial-parameters", async (c) => {
  const buildingId = c.req.param("id");
  const db = c.get("db");
  const access = await findAccessibleBuilding(db, buildingId, c.get("user").id);
  if (!access) return c.json({ error: "Not found" }, 404);

  const [[row], revisions] = await Promise.all([
    db
      .select()
      .from(buildingFinancialParameters)
      .where(eq(buildingFinancialParameters.buildingId, buildingId))
      .limit(1),
    // A10: so the form can send it back as `expectedRevision` on PUT.
    getRevisions(db, buildingId, ["financial"]),
  ]);
  if (!row) {
    const parameters = defaultFinancialParameters();
    return c.json({
      parameters,
      assumptions: deriveFinancialAssumptions(parameters),
      isDefault: true,
      revision: revisions.financial,
    });
  }

  const { buildingId: _id, updatedAt: _updatedAt, ...parameters } = row;
  return c.json({
    parameters,
    assumptions: deriveFinancialAssumptions(parameters),
    isDefault: false,
    revision: revisions.financial,
  });
});

// PUT /:id/financial-parameters - upsert in one atomic batch with its audit_event row (A09b).
// Budget: 4 D1 queries (access check + audit insert + upsert, plus the session lookup). A10's
// `expectedRevision` adds no batch statement; unguarded, +1 query (getRevisions) to report the
// new revision = 5 ≤ 40.
financialRoutes.put("/:id/financial-parameters", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = financialParametersSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const access = await findAccessibleBuilding(db, buildingId, c.get("user").id);
  if (!access) return c.json({ error: "Not found" }, 404);
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const { expectedRevision, ...parameters } = parsed.data;
  const values = { ...parameters, updatedAt: new Date() };
  try {
    await db.batch([
      auditEventStatement(db, c, {
        buildingId,
        entity: "financial",
        entityId: buildingId,
        action: "update",
        expectedRevision,
        summary: { baseYear: parameters.baseYear, periodYears: parameters.periodYears },
      }),
      db
        .insert(buildingFinancialParameters)
        .values({ buildingId, ...values })
        .onConflictDoUpdate({ target: buildingFinancialParameters.buildingId, set: values }),
    ]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "financial");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["financial"])).financial;
  return c.json({
    parameters,
    assumptions: deriveFinancialAssumptions(parameters),
    isDefault: false,
    revision,
  });
});
