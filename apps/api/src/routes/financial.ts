import { buildingFinancialParameters } from "@yres/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
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

  const [row] = await db
    .select()
    .from(buildingFinancialParameters)
    .where(eq(buildingFinancialParameters.buildingId, buildingId))
    .limit(1);
  if (!row) {
    const parameters = defaultFinancialParameters();
    return c.json({
      parameters,
      assumptions: deriveFinancialAssumptions(parameters),
      isDefault: true,
    });
  }

  const { buildingId: _id, updatedAt: _updatedAt, ...parameters } = row;
  return c.json({
    parameters,
    assumptions: deriveFinancialAssumptions(parameters),
    isDefault: false,
  });
});

// PUT /:id/financial-parameters - upsert (3 D1 queries incl. access check)
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

  const values = { ...parsed.data, updatedAt: new Date() };
  await db
    .insert(buildingFinancialParameters)
    .values({ buildingId, ...values })
    .onConflictDoUpdate({ target: buildingFinancialParameters.buildingId, set: values });

  return c.json({
    parameters: parsed.data,
    assumptions: deriveFinancialAssumptions(parsed.data),
    isDefault: false,
  });
});
