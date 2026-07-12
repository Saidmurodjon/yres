import { material } from "@yres/db";
import { Hono } from "hono";
import type { AppEnv } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";

export const referenceRoutes = new Hono<AppEnv>();

referenceRoutes.use("*", authMiddleware);

// GET /materials - global material conductivity reference table, used to
// populate construction-layer pickers when building envelope input forms.
referenceRoutes.get("/materials", async (c) => {
  const db = c.get("db");
  const materials = await db.select().from(material);
  return c.json({ materials });
});
