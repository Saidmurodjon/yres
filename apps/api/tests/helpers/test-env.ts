import type { Env } from "../../src/index";

/**
 * Trivial in-memory stand-in for the R2Bucket binding — just enough of the
 * interface (`put`) for routes/audit.ts's report route to run in tests
 * without a real Cloudflare R2 bucket. Not a full R2Bucket implementation.
 */
const fakeReportsBucket = {
  put: async () => undefined,
} as unknown as Env["REPORTS_BUCKET"];

/**
 * No route exercised by these tests calls into either Durable Object
 * binding yet (Phase 7 of docs/social-features.md is infra-only — no
 * websocket/RPC route wired up to a real request path), so this stub only
 * needs to satisfy `Env`'s shape, not behave like a real
 * `DurableObjectNamespace`. Note this file lives outside apps/api's
 * tsconfig `include` (tests/ isn't type-checked by `tsc --noEmit`), so a
 * type mismatch here wouldn't actually be caught by `bun run type-check` —
 * kept accurate anyway rather than relying on that gap.
 */
const fakeDurableObjectNamespace = {} as unknown as Env["CONVERSATION_ROOM"];

/**
 * Fake Worker bindings for `app.request(path, init, env)` in tests.
 * `DATABASE_URL` is never actually used to connect (see test-db.ts —
 * `createDb` is mocked to ignore its argument) but Better Auth's config
 * shape expects non-empty strings for its social-provider fields.
 */
export const testEnv: Env = {
  DATABASE_URL: "postgresql://yres:yres_dev_password@localhost:5432/yres_test",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  BETTER_AUTH_SECRET: "test-better-auth-secret-at-least-32-characters-long",
  API_URL: "http://localhost:3000",
  // Overridable so the Playwright E2E server (apps/web/playwright.config.ts)
  // can point this at whatever port its Vite dev server actually runs on —
  // CORS requires an exact origin match, not just "some localhost".
  WEB_URL: process.env.E2E_WEB_URL ?? "http://localhost:5173",
  REPORTS_BUCKET: fakeReportsBucket,
  // Blank in tests: sendEmail()/Sentry both no-op on a blank key/DSN rather
  // than erroring (see src/lib/email.ts and the withSentry call in
  // src/index.ts), so tests never send real email or report to Sentry.
  RESEND_API_KEY: "",
  EMAIL_FROM: "",
  SENTRY_DSN: "",
  CONVERSATION_ROOM: fakeDurableObjectNamespace,
  USER_CHANNEL: fakeDurableObjectNamespace,
};
