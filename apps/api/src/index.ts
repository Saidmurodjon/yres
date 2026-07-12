import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppEnv } from "./middleware/auth";
import { auditRoutes } from "./routes/audit";
import { buildingRoutes } from "./routes/buildings";
import { climateRoutes } from "./routes/climate";
import { consumptionRoutes } from "./routes/consumption";
import { envelopeRoutes } from "./routes/envelope";
import { measuresRoutes } from "./routes/measures";

export interface Env {
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  BETTER_AUTH_SECRET: string;
  REPORTS_BUCKET: R2Bucket;
}

const app = new Hono<AppEnv>();

app.use("*", cors());
app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok" }));

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

export default app;
