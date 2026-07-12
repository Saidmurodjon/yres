import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { buildingRoutes } from "./routes/buildings";
import { climateRoutes } from "./routes/climate";

export interface Env {
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  BETTER_AUTH_SECRET: string;
  REPORTS_BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());
app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/buildings", buildingRoutes);
app.route("/api/climate", climateRoutes);

export default app;
