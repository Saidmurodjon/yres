import { seedReferenceDataWithDb } from "@yres/db/seed";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuth } from "../../src/auth";
import type { AppEnv } from "../../src/middleware/auth";
import { auditRoutes } from "../../src/routes/audit";
import { buildingRoutes } from "../../src/routes/buildings";
import { climateRoutes } from "../../src/routes/climate";
import { consumptionRoutes } from "../../src/routes/consumption";
import { envelopeRoutes } from "../../src/routes/envelope";
import { measuresRoutes } from "../../src/routes/measures";
import { referenceRoutes } from "../../src/routes/reference";
import { resetTestDb, testDb } from "../helpers/test-db";
import { testEnv } from "../helpers/test-env";

/**
 * Standalone backend for Playwright E2E tests — the real Hono app (every
 * route file imported unmodified) served over a real HTTP port, with the
 * request-scoped `db` set directly to the local-Postgres test client
 * instead of going through `dbMiddleware`'s `createDb` (which only speaks
 * Neon's protocol; see tests/helpers/test-db.ts). This works with zero
 * module-mocking tricks specifically because every route reads `c.get("db")`
 * rather than constructing its own client — see src/middleware/db.ts.
 *
 * Run directly: `bun run tests/e2e/server.ts` (used as a Playwright
 * `webServer` entry in apps/web/playwright.config.ts).
 */
const app = new Hono<AppEnv>();

app.use("*", cors({ origin: testEnv.WEB_URL, credentials: true }));
app.use("*", logger());
app.use("*", async (c, next) => {
  c.set("db", testDb);
  await next();
});

app.get("/health", (c) => c.json({ status: "ok" }));
app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env, c.get("db")).handler(c.req.raw));
app.route("/api/buildings", buildingRoutes);
app.route("/api/buildings", envelopeRoutes);
app.route("/api/buildings", measuresRoutes);
app.route("/api/buildings", consumptionRoutes);
app.route("/api/buildings", auditRoutes);
app.route("/api/climate", climateRoutes);
app.route("/api/reference", referenceRoutes);

const port = Number(process.env.E2E_API_PORT ?? 3001);

await resetTestDb();
await seedReferenceDataWithDb(testDb);

Bun.serve({
  port,
  fetch: (request) => app.fetch(request, testEnv),
});

console.log(`E2E test API server listening on http://localhost:${port}`);
