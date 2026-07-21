import { lampType, material, surfaceResistance } from "@yres/db";
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

// GET /lamp-types - global lamp power-density reference table (Lighting
// sheet, Q7:R11), used both to populate lighting-zone technology-mix forms
// and by LightingService to weight each zone's power density.
referenceRoutes.get("/lamp-types", async (c) => {
  const db = c.get("db");
  const lampTypes = await db.select().from(lampType);
  return c.json({ lampTypes });
});

// GET /surface-resistance - per-elementCategory interior/exterior surface
// resistance reference table, used to preview a construction type's U-value
// client-side with the exact same formula audit.engine.ts uses server-side.
referenceRoutes.get("/surface-resistance", async (c) => {
  const db = c.get("db");
  const surfaceResistances = await db.select().from(surfaceResistance);
  return c.json({ surfaceResistances });
});
