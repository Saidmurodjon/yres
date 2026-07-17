import * as Sentry from "@sentry/cloudflare";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuth } from "./auth";
import type { AppEnv } from "./middleware/auth";
import { dbMiddleware } from "./middleware/db";
import { rateLimit } from "./middleware/rate-limit";
import { ConversationRoom } from "./durable-objects/conversation-room";
import { UserNotificationChannel } from "./durable-objects/user-notification-channel";
import { adminUsersRoutes } from "./routes/admin-users";
import { auditRoutes } from "./routes/audit";
import { buildingRoutes } from "./routes/buildings";
import { climateRoutes } from "./routes/climate";
import { consumptionRoutes } from "./routes/consumption";
import { envelopeRoutes } from "./routes/envelope";
import { measuresRoutes } from "./routes/measures";
import { membersRoutes } from "./routes/members";
import { referenceRoutes } from "./routes/reference";
import { systemsRoutes } from "./routes/systems";
import { usersRoutes } from "./routes/users";

export interface Env {
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  BETTER_AUTH_SECRET: string;
  API_URL: string;
  WEB_URL: string;
  REPORTS_BUCKET: R2Bucket;
  /** Resend API key for transactional email (password reset, verification). Empty in dev — sendEmail() logs and no-ops without it. */
  RESEND_API_KEY: string;
  /** "From" address for outgoing email, e.g. "YRES <noreply@yourdomain.com>". Falls back to Resend's shared sandbox sender if unset. */
  EMAIL_FROM: string;
  /** Sentry DSN for error tracking. Empty disables reporting (see the withSentry call below). */
  SENTRY_DSN: string;
  /**
   * Cloudflare's native Rate Limiting binding (see wrangler.toml) — only
   * present when provisioned for an environment. `rateLimit()` middleware
   * falls back to an in-memory limiter when this is absent, so it's safe to
   * leave unset locally/in tests.
   */
  RATE_LIMITER?: RateLimit;
  /** Real-time chat/notifications (docs/social-features.md) — see wrangler.toml's durable_objects.bindings. */
  CONVERSATION_ROOM: DurableObjectNamespace<ConversationRoom>;
  USER_CHANNEL: DurableObjectNamespace<UserNotificationChannel>;
}

// Cloudflare binds wrangler.toml's `class_name` to whatever this entry
// module exports under that name — these re-exports are what makes the
// CONVERSATION_ROOM/USER_CHANNEL bindings above resolve to real classes.
export { ConversationRoom, UserNotificationChannel };

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

// Credential-guessing targets: sign-in/sign-up (brute force, credential
// stuffing) and the password-reset request (email-bombing a victim). Other
// /api/auth/* traffic (session checks, OAuth callback) is left unlimited —
// those aren't attacker-useful and get called on every page load.
app.use("/api/auth/sign-in/*", rateLimit({ keyPrefix: "auth-signin", max: 10, windowMs: 60_000 }));
app.use("/api/auth/sign-up/*", rateLimit({ keyPrefix: "auth-signup", max: 10, windowMs: 60_000 }));
app.use(
  "/api/auth/request-password-reset",
  rateLimit({ keyPrefix: "auth-reset", max: 5, windowMs: 60_000 }),
);

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
app.route("/api/buildings", systemsRoutes);
app.route("/api/buildings", membersRoutes);
app.route("/api/climate", climateRoutes);
app.route("/api/reference", referenceRoutes);
app.route("/api/users", usersRoutes);
app.route("/api/admin", adminUsersRoutes);

// Reports uncaught exceptions (route bugs, calculation-engine errors,
// unexpected DB failures) to Sentry with request context. A blank
// SENTRY_DSN (local dev, or before it's provisioned) disables reporting
// entirely rather than erroring — see CloudflareOptions.enabled below.
export default Sentry.withSentry(
  (env: Env) => ({ dsn: env.SENTRY_DSN, enabled: Boolean(env.SENTRY_DSN), tracesSampleRate: 0.1 }),
  app,
);
