import { lampType, material, surfaceResistance } from "@yres/db";
import { Hono } from "hono";
import { withEdgeCache } from "../lib/http-cache";
import type { AppEnv } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";

export const referenceRoutes = new Hono<AppEnv>();

referenceRoutes.use("*", authMiddleware);

// These 3 reference tables change essentially never (they're seeded once,
// not user-editable) and are read on every envelope/lighting form load, so
// they're cached at the edge instead of hitting Neon on every request.
const REFERENCE_CACHE_TTL_SECONDS = 3600;

// GET /materials - global material conductivity reference table, used to
// populate construction-layer pickers when building envelope input forms.
referenceRoutes.get("/materials", (c) =>
  withEdgeCache(c, REFERENCE_CACHE_TTL_SECONDS, async () => {
    const db = c.get("db");
    const materials = await db.select().from(material);
    return { materials };
  }),
);

// GET /lamp-types - global lamp power-density reference table (Lighting
// sheet, Q7:R11), used both to populate lighting-zone technology-mix forms
// and by LightingService to weight each zone's power density.
referenceRoutes.get("/lamp-types", (c) =>
  withEdgeCache(c, REFERENCE_CACHE_TTL_SECONDS, async () => {
    const db = c.get("db");
    const lampTypes = await db.select().from(lampType);
    return { lampTypes };
  }),
);

// GET /surface-resistance - per-elementCategory interior/exterior surface
// resistance reference table, used to preview a construction type's U-value
// client-side with the exact same formula audit.engine.ts uses server-side.
referenceRoutes.get("/surface-resistance", (c) =>
  withEdgeCache(c, REFERENCE_CACHE_TTL_SECONDS, async () => {
    const db = c.get("db");
    const surfaceResistances = await db.select().from(surfaceResistance);
    return { surfaceResistances };
  }),
);
