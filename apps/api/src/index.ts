import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuth } from "./auth";
import type { AppEnv } from "./middleware/auth";
import { dbMiddleware } from "./middleware/db";
import { auditRoutes } from "./routes/audit";
import { buildingRoutes } from "./routes/buildings";
import { climateRoutes } from "./routes/climate";
import { consumptionRoutes } from "./routes/consumption";
import { envelopeRoutes } from "./routes/envelope";
import { measuresRoutes } from "./routes/measures";
import { referenceRoutes } from "./routes/reference";

export interface Env {
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  BETTER_AUTH_SECRET: string;
  API_URL: string;
  WEB_URL: string;
  REPORTS_BUCKET: R2Bucket;
}

const app = new Hono<AppEnv>();

app.use("*", cors({ origin: (origin, c) => c.env.WEB_URL ?? origin, credentials: true }));
app.use("*", logger());
// Constructs the Drizzle client once per request; every route and the auth
// handler below read it via c.get("db") instead of each building their own
// (see middleware/db.ts's doc comment for why — it's what lets a
// standalone test server swap in a different Postgres driver without any
// module-mocking tricks).
app.use("*", dbMiddleware);

app.get("/health", (c) => c.json({ status: "ok" }));

// Better Auth owns every method/path under /api/auth/* (sign-in, sign-up,
// sign-out, session, OAuth callback, etc.) — hand the raw request straight
// to its handler rather than defining routes for it ourselves.
app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env, c.get("db")).handler(c.req.raw));

// These all mount at the same "/api/buildings" base — each router declares
// its own full path (e.g. "/:id/envelope") rather than relying on the mount
// prefix, since Hono only infers typed `c.req.param()` keys from the path
// literal a route is registered with on its own instance.
app.route("/api/buildings", buildingRoutes);
app.route("/api/buildings", envelopeRoutes);
app.route("/api/buildings", measuresRoutes);
app.route("/api/buildings", consumptionRoutes);
app.route("/api/buildings", auditRoutes);
app.route("/api/climate", climateRoutes);
app.route("/api/reference", referenceRoutes);

export default app;
